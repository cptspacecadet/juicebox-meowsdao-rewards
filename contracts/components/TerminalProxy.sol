// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.6;

import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBDirectory.sol';
import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBPaymentTerminal.sol';
import '@jbx-protocol/contracts-v2/contracts/libraries/JBTokens.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

interface IWETH9 is IERC20 {
  function deposit() external payable;

  function withdraw(uint256) external;
}

contract TerminalProxy {
  error PAYMENT_FAILURE();

  IJBDirectory internal jbxDirectory;

  address public constant WETH9 = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
  IQuoter public constant uniswapQuoter = IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);
  ISwapRouter public constant uniswapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

  constructor(IJBDirectory _jbxDirectory) {
    jbxDirectory = _jbxDirectory;
  }

  function processPayment(
    uint256 _jbxProjectId,
    string memory _memo,
    bytes memory _metadata
  ) internal virtual {
    IJBPaymentTerminal terminal = jbxDirectory.primaryTerminalOf(_jbxProjectId, JBTokens.ETH);
    if (address(terminal) == address(0)) {
      revert PAYMENT_FAILURE();
    }

    terminal.pay(_jbxProjectId, msg.value, JBTokens.ETH, msg.sender, 0, false, _memo, _metadata);
  }

  /**
   *
   * @param _token a
   * @param _amount a
   * @param _minValue a
   * @param _jbxProjectId a
   * @param _memo a
   * @param _metadata a
   * @param _liquidate Liquidation flag, if set the token will be converted into Ether and deposited into the project's Ether terminal.
   *
   * @return Success of the processing action. This will be false if there is no appropriate terminal to send funds to.
   */
  function processPayment(
    IERC20 _token,
    uint256 _amount,
    uint256 _minValue,
    uint256 _jbxProjectId,
    string memory _memo,
    bytes memory _metadata,
    bool _liquidate
  ) internal virtual returns (bool) {
    if (!_liquidate) {
      IJBPaymentTerminal terminal = jbxDirectory.primaryTerminalOf(_jbxProjectId, address(_token));
      if (address(terminal) == address(0)) {
        return false;
      }

      terminal.pay(_jbxProjectId, _amount, address(_token), msg.sender, 0, false, _memo, _metadata);
    } else {
      IJBPaymentTerminal terminal = jbxDirectory.primaryTerminalOf(_jbxProjectId, JBTokens.ETH);
      if (address(terminal) == address(0)) {
        return false;
      }

      uint256 requiredTokenAmount = uniswapQuoter.quoteExactOutputSingle(
        address(_token),
        WETH9,
        3000, // fee
        _minValue,
        0 // sqrtPriceLimitX96
      );

      if (requiredTokenAmount > _amount) {
        revert PAYMENT_FAILURE();
      }

      if (!_token.transferFrom(msg.sender, address(this), requiredTokenAmount)) {
        revert PAYMENT_FAILURE();
      }

      if (!_token.approve(address(uniswapRouter), requiredTokenAmount)) {
        revert PAYMENT_FAILURE();
      }

      ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams(
        address(_token),
        WETH9,
        3000, // fee
        address(this),
        block.timestamp + 15, // deadline
        requiredTokenAmount,
        _minValue,
        0 // sqrtPriceLimitX96
      );

      uint256 ethProceeds = uniswapRouter.exactInputSingle(params);
      if (ethProceeds < _minValue) {
        revert PAYMENT_FAILURE();
      }

      IWETH9(WETH9).withdraw(ethProceeds);

      terminal.pay(_jbxProjectId, ethProceeds, JBTokens.ETH, msg.sender, 0, false, _memo, _metadata);
    }

    return true;
  }
}
