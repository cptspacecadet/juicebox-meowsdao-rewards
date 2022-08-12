// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.6;

import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBDirectory.sol';
import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBOperatorStore.sol';
import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBPaymentTerminal.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './components/TerminalProxy.sol';

contract PaymentProcessor is TerminalProxy {
  struct TokenSettings {
    bool accept;
    bool liquidate;
    uint256 margin;
  }

  IJBOperatorStore jbxOperatorStore;
  uint256 jbxProjectId;
  mapping(IERC20 => TokenSettings) tokenPreferences;

  constructor(
    IJBDirectory _jbxDirectory,
    IJBOperatorStore _jbxOperatorStore,
    uint256 _jbxProjectId
  ) TerminalProxy(_jbxDirectory) {
    jbxDirectory = _jbxDirectory;
    jbxOperatorStore = _jbxOperatorStore;
    jbxProjectId = _jbxProjectId;
  }

  receive() external payable {
    super.processPayment(jbxProjectId, '', new bytes(0));
  }

  function processPayment(string memory _memo, bytes memory _metadata) external payable {
    super.processPayment(jbxProjectId, _memo, _metadata);
  }

  function processPayment(
    IERC20 _token,
    uint256 _amount,
    uint256 _minValue,
    string memory _memo,
    bytes memory _metadata
  ) external {
    TokenSettings memory settings = tokenPreferences[_token];
    if (settings.accept) {
      bool success = super.processPayment(_token, _amount, _minValue, jbxProjectId, _memo, _metadata, settings.liquidate);
      if (!success) {
        // TODO
      }
    } else {
      super.processPayment(_token, _amount, _minValue, jbxProjectId, _memo, _metadata, true);
    }
  }

  function setTokenPreferences(
    IERC20 _token,
    bool _accept,
    bool _liquidate,
    uint256 _margin
  ) external {
    // TODO: privileged
    if (!_accept) {
      delete tokenPreferences[_token];
    } else {
      tokenPreferences[_token] = TokenSettings(_accept, _liquidate, _margin);
    }
  }

  function transferTokens(IERC20 _token, uint256 _amount, address _destination) external { // TODO: privileged
    //
  }
}
