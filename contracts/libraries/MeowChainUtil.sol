// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import '@openzeppelin/contracts/utils/Base64.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

import '../components/Storage.sol';
import '../enums/AssetDataType.sol';
import './MeowCommonUtil.sol';

/**
  @notice MEOWs DAO NFT helper functions for managing on-chain image assets.
 */
library MeowChainUtil {
  function validateTraits(uint256 _traits) public view returns (bool) {
    return MeowCommonUtil.validateTraits(_traits);
  }

  function generateTraits(uint256 _seed) public view returns (uint256 traits) {
    return MeowCommonUtil.generateTraits(_seed);
  }

  function listTraits(uint256 _traits) public view returns (string memory names) {
    return MeowCommonUtil.listTraits(_traits);
  }

  function getAssetBase64(
    Storage _assets,
    uint256 _assetId,
    AssetDataType _assetType
  ) public view returns (string memory) {
    string memory prefix = '';

    if (_assetType == AssetDataType.AUDIO_MP3) {
      prefix = 'data:audio/mp3;base64,';
    } else if (_assetType == AssetDataType.IMAGE_SVG) {
      prefix = 'data:image/svg+xml;base64,';
    } else if (_assetType == AssetDataType.IMAGE_PNG) {
      prefix = 'data:image/png;base64,';
    }

    return string(abi.encodePacked(prefix, Base64.encode(_assets.getAssetContentForId(_assetId))));
  }

  function getImageStack(Storage _assets, uint256 _traits) public view returns (string memory image) {
    uint8 population = uint8(_traits >> 252);

    if (population == 1 || population == 2) {
      image = getShirtStack(_assets, _traits);
    } else if (population == 3) {
      image = getTShirtStack(_assets, _traits);
    } else if (population == 4) {
      image = getNakedStack(_assets, _traits);
    } else if (population == 5) {
      image = getSpecialNakedStack(_assets, _traits);
    }
  }

  function getSpecialNakedStack(Storage _assets, uint256 _traits) private view returns (string memory image) {
    uint256 contentId = uint256(uint8(_traits >> MeowCommonUtil.specialNakedOffsets()[0]) & MeowCommonUtil.specialNakedMask()[0]);
    image = __imageTag(getAssetBase64(_assets, contentId, AssetDataType.IMAGE_PNG));

    for (uint8 i = 1; i < 12; ) {
      contentId =
        uint256(uint8(_traits >> MeowCommonUtil.specialNakedOffsets()[i]) & MeowCommonUtil.specialNakedMask()[i]) <<
        MeowCommonUtil.specialNakedOffsets()[i];
      image = string(abi.encodePacked(image, __imageTag(getAssetBase64(_assets, contentId, AssetDataType.IMAGE_PNG))));
      ++i;
    }
  }

  function getNakedStack(Storage _assets, uint256 _traits) private view returns (string memory image) {
    uint256 contentId = uint256(uint8(_traits >> MeowCommonUtil.nakedOffsets()[0]) & MeowCommonUtil.nakedMask()[0]);
    image = __imageTag(getAssetBase64(_assets, contentId, AssetDataType.IMAGE_PNG));

    for (uint8 i = 1; i < 12; ) {
      contentId = uint256(uint8(_traits >> MeowCommonUtil.nakedOffsets()[i]) & MeowCommonUtil.nakedMask()[i]) << MeowCommonUtil.nakedOffsets()[i];
      image = string(abi.encodePacked(image, __imageTag(getAssetBase64(_assets, contentId, AssetDataType.IMAGE_PNG))));
      ++i;
    }
  }

  function getTShirtStack(Storage _assets, uint256 _traits) private view returns (string memory image) {
    uint256 contentId = uint256(uint8(_traits >> MeowCommonUtil.tShirtOffsets()[0]) & MeowCommonUtil.tShirtMask()[0]);
    image = __imageTag(getAssetBase64(_assets, contentId, AssetDataType.IMAGE_PNG));

    for (uint8 i = 1; i < 12; ) {
      contentId = uint256(uint8(_traits >> MeowCommonUtil.tShirtOffsets()[i]) & MeowCommonUtil.tShirtMask()[i]) << MeowCommonUtil.tShirtOffsets()[i];
      image = string(abi.encodePacked(image, __imageTag(getAssetBase64(_assets, contentId, AssetDataType.IMAGE_PNG))));
      ++i;
    }
  }

  function getShirtStack(Storage _assets, uint256 _traits) private view returns (string memory image) {
    uint256 contentId = uint256(uint8(_traits >> MeowCommonUtil.shirtOffsets()[0]) & MeowCommonUtil.shirtMask()[0]);
    image = __imageTag(getAssetBase64(_assets, contentId, AssetDataType.IMAGE_PNG));

    for (uint8 i = 1; i < 13; ) {
      contentId = uint256(uint8(_traits >> MeowCommonUtil.shirtOffsets()[i]) & MeowCommonUtil.shirtMask()[i]) << MeowCommonUtil.shirtOffsets()[i];
      image = string(abi.encodePacked(image, __imageTag(getAssetBase64(_assets, contentId, AssetDataType.IMAGE_PNG))));
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
    Storage _assets,
    uint256 _traits,
    string memory _name,
    uint256 _tokenId
  ) public view returns (string memory) {
    string memory image = Base64.encode(
      abi.encodePacked(
        '<svg id="token" width="1000" height="1000" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="bannyPlaceholder">',
        getImageStack(_assets, _traits),
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
    @dev incoming parameter is wrapped blindly without checking content.
  */
  function __imageTag(string memory _content) private pure returns (string memory tag) {
    tag = string(abi.encodePacked('<image x="50%" y="50%" width="1000" href="', _content, '" style="transform: translate(-500px, -500px)" />'));
  }
}
