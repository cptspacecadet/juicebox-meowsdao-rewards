// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import '../../components/Storage.sol';

/**
  @notice 
 */
library StorageFactory {
  function createStorage(
    address _owner
  ) public returns (address) {
    Storage s = new Storage(_owner);

    return address(s);
  }
}
