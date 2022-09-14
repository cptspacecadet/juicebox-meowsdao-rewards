// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import '../libraries/JsmnLib.sol';

interface IJsmnLibTest {
  function parseTest(string memory json, uint256 numberElements)
    external
    pure
    returns (
      uint256,
      JsmnLib.Token[] memory,
      uint256
    );

  function getBytes(
    string memory json,
    uint256 start,
    uint256 end
  ) external pure returns (string memory);
}

contract JsmnLibTest is IJsmnLibTest {
  function parseTest(string memory json, uint256 numberElements)
    external
    pure
    override
    returns (
      uint256,
      JsmnLib.Token[] memory,
      uint256
    )
  {
    uint256 t;
    uint256 a;
    JsmnLib.Token[] memory tokens;
    (t, tokens, a) = JsmnLib.parse(json, numberElements);
    return (t, tokens, a);
  }

  function getBytes(
    string memory json,
    uint256 start,
    uint256 end
  ) external pure override returns (string memory) {
    string memory s;
    s = JsmnLib.getBytes(json, start, end);
    return s;
  }
}
