// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "../../interfaces/common/IUniswapRouter.sol";
import "../../interfaces/common/IComptroller.sol";
import "../../interfaces/common/IVToken.sol";
import "../common/StratManager.sol";
import "../common/FeeManager.sol";
import { IWrappedNative } from "../../interfaces/common/IWrappedNative.sol";


//Lending Strategy 
contract StrategyMoonwellSupplyOnly is StratManager, FeeManager {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Tokens used
    address public native;
    address public output;
    address public want;
    address public iToken;

    // Third party contracts
    address constant public comptroller = 0x0b7a0EAA884849c6Af7a129e899536dDDcA4905E;

    // Routes
    address[] public outputToNativeRoute;
    address[] public outputToWantRoute;
    address[] public nativeToWantRoute;
    address[] public markets;

    bool public harvestOnDeposit;
    uint256 public lastHarvest;
    uint256 public supplyBal;

    /**
     * @dev Events that the contract emits
     */
    event StratHarvest(address indexed harvester, uint256 wantHarvested, uint256 tvl);
    event Deposit(uint256 tvl);
    event Withdraw(uint256 tvl);

    constructor(
        address[] memory _outputToNativeRoute,
        address[] memory _outputToWantRoute,
        address[] memory _nativeToWantRoute,
        address[] memory _markets,
        address _vault,
        address _unirouter,
        address _keeper,
        address _strategist,
        address _beefyFeeRecipient
    ) StratManager(_keeper, _strategist, _unirouter, _vault, _beefyFeeRecipient) public {
        iToken = _markets[0];
        markets = _markets;
        want = IVToken(iToken).underlying();

        output = _outputToNativeRoute[0];
        native = _outputToNativeRoute[_outputToNativeRoute.length - 1];
        outputToNativeRoute = _outputToNativeRoute;
        nativeToWantRoute = _nativeToWantRoute;

        require(_outputToWantRoute[0] == output, "outputToWantRoute[0] != output");
        require(_outputToWantRoute[_outputToWantRoute.length - 1] == want, "outputToNativeRoute[last] != want");
        outputToWantRoute = _outputToWantRoute;

        _giveAllowances();

        IComptroller(comptroller).enterMarkets(markets);
    }

    // puts the funds to work
    function deposit() public whenNotPaused {
        uint256 wantBal = availableWant();

        if (wantBal > 0) {
            IVToken(iToken).mint(wantBal);
            updateBalance();
            emit Deposit(balanceOf());
        }

    }

    // To receive MOVR
    fallback() external payable {}
    receive() external payable {}

    function beforeDeposit() external override {
        if (harvestOnDeposit) {
            require(msg.sender == vault, "!vault");
            _harvest(tx.origin);
        }
        updateBalance();
    }

    function harvest() public whenNotPaused {
        _harvest(tx.origin);
    }

    function harvest(address callFeeRecipient) external virtual {
        _harvest(callFeeRecipient);
    }

    function managerHarvest() external onlyManager {
        _harvest(tx.origin);
    }

    // compounds earnings and charges performance fee
    function _harvest(address callFeeRecipient) internal whenNotPaused {
        if (IComptroller(comptroller).pendingComptrollerImplementation() == address(0)) {
            uint256 beforeBal = availableWant();
            IComptroller(comptroller).claimReward(0, address(this));
            IComptroller(comptroller).claimReward(1, address(this));
            uint256 outputBal = IERC20(output).balanceOf(address(this));
            if (outputBal > 0) {
                chargeFees(callFeeRecipient);
                swapRewards();
                uint256 wantHarvested = availableWant().sub(beforeBal);
                deposit();

                lastHarvest = block.timestamp;
                emit StratHarvest(msg.sender, wantHarvested, balanceOf());
            }
        } else {
            panic();
        }
    }

    // performance fees
    function chargeFees(address callFeeRecipient) internal {
        uint256 toNative = IERC20(output).balanceOf(address(this)).mul(45).div(1000);
        uint256 nativeRewardBal = address(this).balance.mul(45).div(1000);
        
        IUniswapRouter(unirouter).swapExactTokensForTokens(toNative, 0, outputToNativeRoute, address(this), now);
        if (nativeRewardBal > 0) {
            IWrappedNative(native).deposit{value: nativeRewardBal}();
        }

        uint256 nativeBal = IERC20(native).balanceOf(address(this));

        uint256 callFeeAmount = nativeBal.mul(callFee).div(MAX_FEE);
        IERC20(native).safeTransfer(callFeeRecipient, callFeeAmount);

        uint256 beefyFeeAmount = nativeBal.mul(beefyFee).div(MAX_FEE);
        IERC20(native).safeTransfer(beefyFeeRecipient, beefyFeeAmount);

        uint256 strategistFeeAmount = nativeBal.mul(strategistFee).div(MAX_FEE);
        IERC20(native).safeTransfer(strategist, strategistFeeAmount);
    }

    // swap rewards to {want}
    function swapRewards() internal {
        uint256 outputBal = IERC20(output).balanceOf(address(this));
        uint256 nativeBal = address(this).balance;
        if (nativeBal > 0) {
            IWrappedNative(native).deposit{value: nativeBal}();
        }
        IUniswapRouter(unirouter).swapExactTokensForTokens(outputBal, 0, outputToWantRoute, address(this), now);
        IUniswapRouter(unirouter).swapExactTokensForTokens(nativeBal, 0, nativeToWantRoute, address(this), now);
    }

    /**
     * @param _amount How much {want} to withdraw.
     */
    function withdraw(uint256 _amount) external {
        require(msg.sender == vault, "!vault");

        uint256 wantBal = availableWant();

        if (wantBal < _amount) {
            IVToken(iToken).redeemUnderlying(_amount.sub(wantBal));
            updateBalance();
            wantBal = IERC20(want).balanceOf(address(this));
        }

        if (wantBal > _amount) {
            wantBal = _amount;
        }

        if (tx.origin != owner() && !paused()) {
            uint256 withdrawalFeeAmount = wantBal.mul(withdrawalFee).div(WITHDRAWAL_MAX);
            wantBal = wantBal.sub(withdrawalFeeAmount);
        }

        IERC20(want).safeTransfer(vault, wantBal);
        updateBalance();
        emit Withdraw(balanceOf());
    }

    /**
     * @return how much {want} the contract holds
     */
    function availableWant() public view returns (uint256) {
        uint256 wantBal = IERC20(want).balanceOf(address(this));
        return wantBal;
    }

    // return supply and borrow balance
    function updateBalance() public {
        supplyBal = IVToken(iToken).balanceOfUnderlying(address(this));
    }


    // calculate the total underlaying 'want' held by the strat.
    function balanceOf() public view returns (uint256) {
        return balanceOfWant().add(supplyBal);
    }

    // it calculates how much 'want' this contract holds.
    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    // returns rewards unharvested
    function rewardsAvailable() public returns (uint256) {
        IComptroller(comptroller).claimReward(0, address(this));
        IComptroller(comptroller).claimReward(1, address(this));
        return IERC20(output).balanceOf(address(this));
    }

    // native reward amount for calling harvest
    function callReward() public returns (uint256) {
        uint256 outputBal = rewardsAvailable();
        uint256 nativeOut;
        if (outputBal > 0) {
            try IUniswapRouter(unirouter).getAmountsOut(outputBal, outputToNativeRoute)
                returns (uint256[] memory amountOut)
            {
                nativeOut = amountOut[amountOut.length -1];
            }
            catch {}
        }

        return nativeOut.mul(45).div(1000).mul(callFee).div(MAX_FEE);
    }

    function setHarvestOnDeposit(bool _harvestOnDeposit) external onlyManager {
        harvestOnDeposit = _harvestOnDeposit;

        if (harvestOnDeposit == true) {
            super.setWithdrawalFee(0);
        } else {
            super.setWithdrawalFee(10);
        }
    }

    // called as part of strat migration. Sends all the available funds back to the vault.
    function retireStrat() external {
        require(msg.sender == vault, "!vault");
        IVToken(iToken).redeemUnderlying(supplyBal);
        updateBalance();
        uint256 wantBal = IERC20(want).balanceOf(address(this));
        IERC20(want).transfer(vault, wantBal);
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        IVToken(iToken).redeemUnderlying(supplyBal);
        uint256 wantBal = IERC20(want).balanceOf(address(this));
        IERC20(want).transfer(vault, wantBal);
        updateBalance();
        pause();
    }

    function pause() public onlyManager {
        _pause();

        _removeAllowances();
    }

    function unpause() external onlyManager {
        _unpause();

        _giveAllowances();

        deposit();
    }

    function _giveAllowances() internal {
        IERC20(want).safeApprove(iToken, uint256(-1));
        IERC20(output).safeApprove(unirouter, uint256(-1));
    }

    function _removeAllowances() internal {
        IERC20(want).safeApprove(iToken, 0);
        IERC20(output).safeApprove(unirouter, 0);
    }

     function outputToNative() external view returns(address[] memory) {
        return outputToNativeRoute;
    }

    function outputToWant() external view returns(address[] memory) {
        return outputToWantRoute;
    }
}