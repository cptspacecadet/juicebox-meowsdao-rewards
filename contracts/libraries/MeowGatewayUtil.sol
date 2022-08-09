// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import '@openzeppelin/contracts/utils/Base64.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

import './MeowCommonUtil.sol';

/**
  @notice MEOWs DAO NFT helper functions for managing IPFS image assets.
 */
library MeowGatewayUtil {
  function validateTraits(uint256 _traits) public view returns (bool) {
    return MeowCommonUtil.validateTraits(_traits);
  }

  function generateTraits(uint256 _seed) public view returns (uint256 traits) {
    return MeowCommonUtil.generateTraits(_seed);
  }

  function listTraits(uint256 _traits) public view returns (string memory names) {
    return MeowCommonUtil.listTraits(_traits);
  }

  /**
    @notice

    @dev The ipfs urls within the svg document created by this function will be built from the provided parameters and the appended individual trait index as hex with an ending '.svg'.

    @param _ipfsGateway Fully qualified http url for an ipfs gateway.
    @param _ipfsRoot ipfs url path containing the individual assets with the trailing slash.
    @param _traits Encoded traits set to compose.
   */
  function getImageStack(
    string memory _ipfsGateway,
    string memory _ipfsRoot,
    uint256 _traits
  ) public view returns (string memory image) {
    uint8 population = uint8(_traits >> 252);

    if (population == 1 || population == 2) {
      image = getShirtStack(_ipfsGateway, _ipfsRoot, _traits);
    } else if (population == 3) {
      image = getTShirtStack(_ipfsGateway, _ipfsRoot, _traits);
    } else if (population == 4) {
      image = getNakedStack(_ipfsGateway, _ipfsRoot, _traits);
    } else if (population == 5) {
      image = getSpecialNakedStack(_ipfsGateway, _ipfsRoot, _traits);
    }
  }

  function getSpecialNakedStack(
    string memory _ipfsGateway,
    string memory _ipfsRoot,
    uint256 _traits
  ) private view returns (string memory image) {
    image = __imageTag(
      _ipfsGateway,
      _ipfsRoot,
      uint256(uint8(_traits >> MeowCommonUtil.specialNakedOffsets()[0]) & MeowCommonUtil.specialNakedMask()[0])
    );
    for (uint8 i = 1; i < 12; ) {
      image = string(
        abi.encodePacked(
          image,
          __imageTag(
            _ipfsGateway,
            _ipfsRoot,
            uint256(uint8(_traits >> MeowCommonUtil.specialNakedOffsets()[i]) & MeowCommonUtil.specialNakedMask()[i]) <<
              MeowCommonUtil.specialNakedOffsets()[i]
          )
        )
      );
      ++i;
    }
  }

  function getNakedStack(
    string memory _ipfsGateway,
    string memory _ipfsRoot,
    uint256 _traits
  ) private view returns (string memory image) {
    image = __imageTag(
      _ipfsGateway,
      _ipfsRoot,
      uint256(uint8(_traits >> MeowCommonUtil.nakedOffsets()[0]) & MeowCommonUtil.nakedMask()[0])
    );
    for (uint8 i = 1; i < 12; ) {
      image = string(
        abi.encodePacked(
          image,
          __imageTag(
            _ipfsGateway,
            _ipfsRoot,
            uint256(uint8(_traits >> MeowCommonUtil.nakedOffsets()[i]) & MeowCommonUtil.nakedMask()[i]) << MeowCommonUtil.nakedOffsets()[i]
          )
        )
      );
      ++i;
    }
  }

  function getTShirtStack(
    string memory _ipfsGateway,
    string memory _ipfsRoot,
    uint256 _traits
  ) private view returns (string memory image) {
    image = __imageTag(
      _ipfsGateway,
      _ipfsRoot,
      uint256(uint8(_traits >> MeowCommonUtil.tShirtOffsets()[0]) & MeowCommonUtil.tShirtMask()[0])
    );
    for (uint8 i = 1; i < 12; ) {
      image = string(
        abi.encodePacked(
          image,
          __imageTag(
            _ipfsGateway,
            _ipfsRoot,
            uint256(uint8(_traits >> MeowCommonUtil.tShirtOffsets()[i]) & MeowCommonUtil.tShirtMask()[i]) << MeowCommonUtil.tShirtOffsets()[i]
          )
        )
      );
      ++i;
    }
  }

  function getShirtStack(
    string memory _ipfsGateway,
    string memory _ipfsRoot,
    uint256 _traits
  ) private view returns (string memory image) {
    image = __imageTag(
      _ipfsGateway,
      _ipfsRoot,
      uint256(uint8(_traits >> MeowCommonUtil.shirtOffsets()[0]) & MeowCommonUtil.shirtMask()[0])
    );
    for (uint8 i = 1; i < 13; ) {
      image = string(
        abi.encodePacked(
          image,
          __imageTag(
            _ipfsGateway,
            _ipfsRoot,
            uint256(uint8(_traits >> MeowCommonUtil.shirtOffsets()[i]) & MeowCommonUtil.shirtMask()[i]) << MeowCommonUtil.shirtOffsets()[i]
          )
        )
      );
      ++i;
    }
  }

  function generateSeed(
    address _account,
    uint256 _blockNumber,
    uint256 _other
  ) public view returns (uint256 seed) {
    seed = uint256(keccak256(abi.encodePacked(_account, _blockNumber, _other)));
  }

  function dataUri(
    string memory _ipfsGateway,
    string memory _ipfsRoot,
    uint256 _traits,
    string memory _name,
    uint256 _tokenId
  ) public view returns (string memory) {
    string memory image = Base64.encode(
      abi.encodePacked(
        '<svg id="token" width="1000" height="1000" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="bannyPlaceholder">',
        getImageStack(_ipfsGateway, _ipfsRoot, _traits),
        '</g></svg>'
      )
    );

    string memory json = Base64.encode(
      abi.encodePacked(
        '{"name": "',
        _name,
        ' No.',
        Strings.toString(_tokenId),
        '", "description": "An on-chain NFT", "image": "data:image/svg+xml;base64,',
        image,
        '", "attributes": {',
        listTraits(_traits),
        '} }'
      )
    );

    return string(abi.encodePacked('data:application/json;base64,', json));
  }

  /**
    @notice Constructs and svg image tag by appending the parameters.

    @param _ipfsGateway HTTP IPFS gateway. The url must contain the trailing slash.
    @param _ipfsRoot IPFS path, must contain tailing slash.
    @param _imageIndex Image index that will be converted to string and used as a filename.
    */
  function __imageTag(
    string memory _ipfsGateway,
    string memory _ipfsRoot,
    uint256 _imageIndex
  ) private view returns (string memory tag) {
    tag = string(
      abi.encodePacked(
        '<image x="50%" y="50%" width="1000" href="',
        _ipfsGateway,
        _ipfsRoot,
        Strings.toString(_imageIndex),
        '" style="transform: translate(-500px, -500px)" />'
      )
    );
  }
}
