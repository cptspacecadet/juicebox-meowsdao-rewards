// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import '../../Token.sol';

/**
  @notice 
 */
library TokenFactory {
    function createToken(
    string memory _name,
    string memory _symbol,
    string memory _baseUri,
    string memory _contractUri,
    uint256 _jbxProjectId,
    IJBDirectory _jbxDirectory,
    uint256 _maxSupply,
    uint256 _unitPrice,
    uint256 _mintAllowance,
    uint128 _mintPeriodStart,
    uint128 _mintPeriodEnd,
    address _owner
  ) public returns (address) {
    Token t = new Token(
      _name,
      _symbol,
      _baseUri,
      _contractUri,
      _jbxProjectId,
      _jbxDirectory,
      _maxSupply,
      _unitPrice,
      _mintAllowance,
      _mintPeriodStart,
      _mintPeriodEnd
    );

    t.grantRole(0x00, _owner); // AccessControl.DEFAULT_ADMIN_ROLE
    t.grantRole(keccak256('MINTER_ROLE'), _owner);
    t.revokeRole(keccak256('MINTER_ROLE'), address(this));
    t.revokeRole(0x00, address(this));

    return address(t);
  }
}
