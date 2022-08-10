// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBDirectory.sol';

import './components/Storage.sol';
import './libraries/factory/AuctionMachineFactory.sol';
import './libraries/factory/StorageFactory.sol';
import './libraries/factory/TraitsChainTokenFactory.sol';
import './libraries/factory/TraitsGatewayTokenFactory.sol';
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

  function createStorage(address _owner) public returns (address) {
    address s = StorageFactory.createStorage(_owner);

    emit Deployment('Storage', s, _owner);

    return s;
  }

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
    address t = TraitsGatewayTokenFactory.createTraitsGatewayToken(
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
      _ipfsRoot,
      _owner
    );

    emit Deployment('TraitsGatewayToken', t, _owner);

    return t;
  }

  function createTraitsChainToken(
    string memory _name,
    string memory _symbol,
    string memory _baseUri,
    string memory _contractUri,
    uint256 _jbxProjectId,
    IJBDirectory _jbxDirectory,
    uint256 _maxSupply,
    uint256 _unitPrice,
    uint256 _mintAllowance,
    Storage _assets,
    address _owner
  ) public returns (address) {
    address t = TraitsChainTokenFactory.createTraitsChainToken(
      _name,
      _symbol,
      _baseUri,
      _contractUri,
      _jbxProjectId,
      _jbxDirectory,
      _maxSupply,
      _unitPrice,
      _mintAllowance,
      _assets,
      _owner
    );

    emit Deployment('TraitsChainToken', t, _owner);

    return t;
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
