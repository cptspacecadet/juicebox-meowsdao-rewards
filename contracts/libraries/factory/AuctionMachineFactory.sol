// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import '../../AuctionMachine.sol';

/**
  @notice 
 */
library AuctionMachineFactory {
  function createAuctionMachine(
      uint256 _maxAuctions,
      uint256 _auctionDuration,
      uint256 _projectId,
      IJBDirectory _jbxDirectory,
      Token _token,
      address _owner
    ) public returns (address) {
      AuctionMachine am = new AuctionMachine(
        _maxAuctions,
        _auctionDuration,
        _projectId,
        _jbxDirectory,
        _token
      );

      am.transferOwnership(_owner);

      return address(am);
    }
}
