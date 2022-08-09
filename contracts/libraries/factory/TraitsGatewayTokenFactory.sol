// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import '../../TraitsGatewayToken.sol';

/**
  @notice 
 */
library TraitsGatewayTokenFactory {
  function createTraitsGatewayToken(
    string memory _name,
    string memory _symbol,
    string memory _baseUri,
    string memory _contractUri,
    uint256 _jbxProjectId,
    IJBDirectory _jbxDirectory,
    uint256 _maxSupply,
    uint256 _unitPrice,
    uint256 _mintAllowance,
    string memory _ipfsGateway,
    string memory _ipfsRoot,
    address _owner
  ) public returns (address) {
    TraitsGatewayToken t = new TraitsGatewayToken(
      _name,
      _symbol,
      _baseUri,
      _contractUri,
      _jbxProjectId,
      _jbxDirectory,
      _maxSupply,
      _unitPrice,
      _mintAllowance,
      _ipfsGateway,
      _ipfsRoot
    );

    t.grantRole(0x00, _owner); // AccessControl.DEFAULT_ADMIN_ROLE
    t.grantRole(keccak256('MINTER_ROLE'), _owner);
    t.revokeRole(keccak256('MINTER_ROLE'), address(this));
    t.revokeRole(0x00, address(this));

    return address(t);
  }
}
