// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../../interfaces/solar/ISolarRouter.sol";
import "../../interfaces/common/IWrappedNative.sol";
import "../../interfaces/solar/ISolarChef.sol";
import "../../interfaces/solar/ISwap.sol";
import "../common/StratManager.sol";
import "../common/FeeManager.sol";

contract StrategySolarbeamFarm is StratManager, FeeManager {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Tokens used
    address public native;
    address public output;
    address public want;
    address public swapper;
    address public swap;
    uint8 public swapIndex;
    uint256 public tokensInPool;

    // Third party contracts
    address public chef;
    uint256 public poolId;

    bool public harvestOnDeposit;
    uint256 public lastHarvest;

    // Routes
    address[] public outputToNativeRoute;
    address[] public outputToSwapRoute;
    address[][] public rewardToOutputRoute;

    /**
     * @dev Event that is fired each time someone harvests the strat.
     */
    event StratHarvest(address indexed harvester, uint256 wantHarvested, uint256 tvl);
    event Deposit(uint256 tvl);
    event Withdraw(uint256 tvl);
    event ChargedFees(uint256 callFees, uint256 beefyFees, uint256 strategistFees);

    constructor(
        address _want,
        uint256 _poolId,
        address _chef,
        address _swapper,
        address _vault,
        address _unirouter,
        address _keeper,
        address _strategist,
        address _beefyFeeRecipient,
        address[] memory _outputToNativeRoute,
        address[] memory _outputToSwapRoute
    ) StratManager(_keeper, _strategist, _unirouter, _vault, _beefyFeeRecipient) public {
        want = _want;
        poolId = _poolId;
        chef = _chef;
        swapper = _swapper;
        swap = _outputToSwapRoute[_outputToSwapRoute.length - 1];
        swapIndex = ISwap(swapper).getTokenIndex(swap);
        tokensInPool = ISwap(swapper).getNumberOfTokens();

        output = _outputToNativeRoute[0];
        native = _outputToNativeRoute[_outputToNativeRoute.length - 1];
        
        outputToNativeRoute = _outputToNativeRoute;
        outputToSwapRoute = _outputToSwapRoute;

        _giveAllowances();
    }

    // puts the funds to work
    function deposit() public whenNotPaused {
        uint256 wantBal = IERC20(want).balanceOf(address(this));

        if (wantBal > 0) {
            ISolarChef(chef).deposit(poolId, wantBal);
            emit Deposit(balanceOf());
        }
    }

    function withdraw(uint256 _amount) external {
        require(msg.sender == vault, "!vault");

        uint256 wantBal = IERC20(want).balanceOf(address(this));

        if (wantBal < _amount) {
            ISolarChef(chef).withdraw(poolId, _amount.sub(wantBal));
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

        emit Withdraw(balanceOf());
    }

    function beforeDeposit() external override {
        if (harvestOnDeposit) {
            require(msg.sender == vault, "!vault");
            _harvest(tx.origin);
        }
    }

    function harvest() external virtual {
        _harvest(tx.origin);
    }

    function harvest(address callFeeRecipient) external virtual {
        _harvest(callFeeRecipient);
    }

    function managerHarvest() external onlyManager {
        _harvest(tx.origin);
    }

    // compounds earnings and charges performance fee
    function _harvest(address callFeeRecipient) internal {
        ISolarChef(chef).deposit(poolId, 0);
        uint256 outputBal = IERC20(output).balanceOf(address(this));
        if (outputBal > 0) {
            chargeFees(callFeeRecipient);
            addLiquidity();
            uint256 wantHarvested = balanceOfWant();
            deposit();

            lastHarvest = block.timestamp;
            emit StratHarvest(msg.sender, wantHarvested, balanceOf());
        }
    }

    // performance fees
    function chargeFees(address callFeeRecipient) internal {
        if (rewardToOutputRoute.length != 0) {
            for (uint i; i < rewardToOutputRoute.length; i++) {
                if(rewardToOutputRoute[i][0] == native) {
                    uint256 nativeBal = address(this).balance;
                    if(nativeBal > 0) {
                        IWrappedNative(native).deposit{value: nativeBal}();
                    }   
                }
                uint256 rewardBal = IERC20(rewardToOutputRoute[i][0]).balanceOf(address(this));
                if (rewardBal > 0) {
                    ISolarRouter(unirouter).swapExactTokensForTokens(rewardBal, 0, rewardToOutputRoute[i], address(this), now);
                }
            }
        }

        uint256 toNative = IERC20(output).balanceOf(address(this)).mul(45).div(1000);
        ISolarRouter(unirouter).swapExactTokensForTokens(toNative, 0, outputToNativeRoute, address(this), now);

        uint256 nativeBal = IERC20(native).balanceOf(address(this));

        uint256 callFeeAmount = nativeBal.mul(callFee).div(MAX_FEE);
        IERC20(native).safeTransfer(callFeeRecipient, callFeeAmount);

        uint256 beefyFeeAmount = nativeBal.mul(beefyFee).div(MAX_FEE);
        IERC20(native).safeTransfer(beefyFeeRecipient, beefyFeeAmount);

        uint256 strategistFeeAmount = nativeBal.mul(strategistFee).div(MAX_FEE);
        IERC20(native).safeTransfer(strategist, strategistFee);

        emit ChargedFees(callFeeAmount, beefyFeeAmount, strategistFeeAmount);
    }

    // Adds liquidity to AMM and gets more LP tokens.
    function addLiquidity() internal {
        uint256 outputBal = IERC20(output).balanceOf(address(this));

        if (swap != output) {
            ISolarRouter(unirouter).swapExactTokensForTokens(outputBal, 0, outputToSwapRoute, address(this), now);
        }

        uint256 swapBal = IERC20(swap).balanceOf(address(this));
        uint256[] memory swapAmounts = new uint256[](tokensInPool);
        swapAmounts[swapIndex] = swapBal;
        ISwap(swapper).addLiquidity(swapAmounts, 1, now);
    }

    // calculate the total underlaying 'want' held by the strat.
    function balanceOf() public view returns (uint256) {
        return balanceOfWant().add(balanceOfPool());
    }

    // it calculates how much 'want' this contract holds.
    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    // it calculates how much 'want' the strategy has working in the farm.
    function balanceOfPool() public view returns (uint256) {
        (uint256 _amount,,,) = ISolarChef(chef).userInfo(poolId, address(this));
        return _amount;
    }

    function rewardsAvailable() public view returns (uint256[] memory) {
        (,,,uint256[] memory amounts) = ISolarChef(chef).pendingTokens(poolId, address(this));
        return amounts;
    }

    function callReward() public view returns (uint256) {
        uint256[] memory rewardBal = rewardsAvailable();
        uint256 nativeBal;
        try ISolarRouter(unirouter).getAmountsOut(rewardBal[0], outputToNativeRoute, 25)
        returns (uint256[] memory amountOut)
        {
            nativeBal = amountOut[amountOut.length - 1];
        } catch {}

        if (rewardToOutputRoute.length != 0) {
            for (uint i; i < rewardToOutputRoute.length; i++) {
                try ISolarRouter(unirouter).getAmountsOut(rewardBal[i+1], rewardToOutputRoute[i], 25)
                returns (uint256[] memory initialAmountOut)
                {
                    uint256 outputBal = initialAmountOut[initialAmountOut.length - 1];
                    try ISolarRouter(unirouter).getAmountsOut(outputBal, outputToNativeRoute, 25)
                    returns (uint256[] memory finalAmountOut)
                    {
                        nativeBal += finalAmountOut[finalAmountOut.length - 1];
                    } catch {}
                } catch {}
            }
        }

        return nativeBal.mul(45).div(1000).mul(callFee).div(MAX_FEE);
    }

    function setHarvestOnDeposit(bool _harvestOnDeposit) external onlyManager {
        harvestOnDeposit = _harvestOnDeposit;

        if (harvestOnDeposit) {
            setWithdrawalFee(0);
        } else {
            setWithdrawalFee(10);
        }
    }

    // called as part of strat migration. Sends all the available funds back to the vault.
    function retireStrat() external {
        require(msg.sender == vault, "!vault");

        ISolarChef(chef).emergencyWithdraw(poolId);

        uint256 wantBal = IERC20(want).balanceOf(address(this));
        IERC20(want).transfer(vault, wantBal);
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        pause();
        ISolarChef(chef).emergencyWithdraw(poolId);
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
        IERC20(want).safeApprove(chef, uint256(-1));
        IERC20(output).safeApprove(unirouter, uint256(-1));

        IERC20(swap).safeApprove(swapper, uint256(-1));

        if (rewardToOutputRoute.length != 0) {
            for (uint i; i < rewardToOutputRoute.length; i++) {
                IERC20(rewardToOutputRoute[i][0]).safeApprove(unirouter, 0);
                IERC20(rewardToOutputRoute[i][0]).safeApprove(unirouter, uint256(-1));
            }
        }
    }

    function _removeAllowances() internal {
        IERC20(want).safeApprove(chef, 0);
        IERC20(output).safeApprove(unirouter, 0);

        IERC20(swap).safeApprove(swapper, 0);

        if (rewardToOutputRoute.length != 0) {
            for (uint i; i < rewardToOutputRoute.length; i++) {
                IERC20(rewardToOutputRoute[i][0]).safeApprove(unirouter, 0);
            }
        }
    }

    function addRewardRoute(address[] memory _rewardToOutputRoute) external onlyOwner {
        IERC20(_rewardToOutputRoute[0]).safeApprove(unirouter, 0);
        IERC20(_rewardToOutputRoute[0]).safeApprove(unirouter, uint256(-1));
        rewardToOutputRoute.push(_rewardToOutputRoute);
    }

    function removeLastRewardRoute() external onlyOwner {
        address reward = rewardToOutputRoute[rewardToOutputRoute.length - 1][0];
        if (reward != swap) {
            IERC20(reward).safeApprove(unirouter, 0);
        }
        rewardToOutputRoute.pop();
    }

    function outputToNative() external view returns (address[] memory) {
        return outputToNativeRoute;
    }

    function outputToSwap() external view returns (address[] memory) {
        return outputToSwapRoute;
    }

    function rewardToOutput() external view returns (address[][] memory) {
        return rewardToOutputRoute;
    }
     
    receive () external payable {}
}