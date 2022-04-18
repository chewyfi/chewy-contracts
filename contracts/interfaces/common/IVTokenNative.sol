// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IVTokenNative is IERC20 {
    function underlying() external returns (address);
    function mint() external payable;
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow() external payable;
    function balanceOfUnderlying(address owner) external returns (uint);
    function borrowBalanceCurrent(address account) external returns (uint);
    function comptroller() external returns (address);
}