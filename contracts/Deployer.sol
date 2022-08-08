// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBDirectory.sol';

import './libraries/factory/AuctionMachineFactory.sol';
import './libraries/factory/TokenFactory.sol';
import './libraries/factory/UnorderedTokenFactory.sol';

// TODO: should be upgradeable

contract Deployer {
  event Deployment(string contractType, address contractAddress, address owner);

  function createAuctionMachine(
    uint256 _maxAuctions,
    uint256 _auctionDuration,
    uint256 _projectId,
    IJBDirectory _jbxDirectory,
    Token _token,
    address _owner
  ) public returns (address) {
    address am = AuctionMachineFactory.createAuctionMachine(
      _maxAuctions,
      _auctionDuration,
      _projectId,
      _jbxDirectory,
      _token,
      _owner
    );

    emit Deployment('AuctionMachine', am, _owner);

    return am;
  }

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
    address t = TokenFactory.createToken(
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
      _mintPeriodEnd,
      _owner
    );

    emit Deployment('Token', t, _owner);

    return t;
  }

  function createUnorderedToken(
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
    address t = UnorderedTokenFactory.createUnorderedToken(
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
      _mintPeriodEnd,
      _owner
    );

    emit Deployment('UnorderedToken', t, _owner);

    return t;
  }
}
