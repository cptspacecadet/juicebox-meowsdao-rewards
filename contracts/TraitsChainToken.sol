// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.6;

import './components/Storage.sol';
import './libraries/MeowChainUtil.sol';
import './Token.sol';

contract TraitsChainToken is Token {
  using Strings for uint256;

  //*********************************************************************//
  // --------------------- public stored properties -------------------- //
  //*********************************************************************//

  Storage assets;

  /** 
    @notice
    Map of token ids to traits.
  */
  mapping(uint256 => uint256) public tokenTraits;

  //*********************************************************************//
  // -------------------------- constructor ---------------------------- //
  //*********************************************************************//

  /**
    @notice Creates the NFT contract.

    @dev While this contract inherits from `Token` mintPeriodStart and mintPeriodEnd are defaulted to 0 and 0. To adjust the minting period use `updateMintPeriod(uint128, uint128)` after deploymet.

    @param _name Token name.
    @param _symbol Token symbol
    @param _baseUri Base URI, initially expected to point at generic, "unrevealed" metadata json.
    @param _contractUri OpenSea-style contract metadata URI.
    @param _jbxProjectId Juicebox project id that will be paid the proceeds of the sale.
    @param _jbxDirectory Juicebox directory to determine payment destination.
    @param _unitPrice Price per token expressed in Ether.
    @param _mintAllowance Per-user mint cap.
    @param _assets Storage contract instance.
   */
  constructor(
    string memory _name,
    string memory _symbol,
    string memory _baseUri,
    string memory _contractUri,
    uint256 _jbxProjectId,
    IJBDirectory _jbxDirectory,
    uint256 _maxSupply,
    uint256 _unitPrice,
    uint256 _mintAllowance,
    Storage _assets
  )
    Token(
      _name,
      _symbol,
      _baseUri,
      _contractUri,
      _jbxProjectId,
      _jbxDirectory,
      _maxSupply,
      _unitPrice,
      _mintAllowance,
      0,
      0
    )
  {
    assets = _assets;
  }

  //*********************************************************************//
  // ------------------------- external views -------------------------- //
  //*********************************************************************//

  /**
    @dev If the token has been set as "revealed", returned uri will append the token id
    */
  function tokenURI(uint256 _tokenId) public view override returns (string memory uri) {
    if (ownerOf(_tokenId) == address(0)) { revert INVALID_TOKEN(); }

    if (isRevealed) {
        uint256 traits = tokenTraits[_tokenId];
        return MeowChainUtil.dataUri(assets, traits, name, _tokenId);
    } else {
        uri = baseUri;
    }
  }

  //*********************************************************************//
  // ---------------------- external transactions ---------------------- //
  //*********************************************************************//

  /**
    @notice Mints a token to the calling account. Must be paid in Ether if price is non-zero.

    @dev Proceeds are forwarded to the default jbx terminal for the project id set in the constructor. Payment will fail if the terminal is not set in the jbx directory.
   */
  function mint()
    external
    payable
    override
    nonReentrant
    onlyDuringMintPeriod
    returns (uint256 tokenId)
  {
    if (totalSupply == maxSupply) {
      revert SUPPLY_EXHAUSTED();
    }

    processPayment();

    unchecked {
      ++totalSupply;
    }
    tokenId = totalSupply;

    uint256 seed = (MeowChainUtil.generateSeed(msg.sender, block.number, tokenId) &
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) | (1 << 252); // TODO: consider tiers

    tokenTraits[tokenId] = MeowChainUtil.generateTraits(seed);

    _mint(msg.sender, tokenId);
  }

  function mintFor(address _account) override external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
    if (totalSupply == maxSupply) {
      revert SUPPLY_EXHAUSTED();
    }

    unchecked {
      ++totalSupply;
    }

    uint256 seed = (MeowChainUtil.generateSeed(msg.sender, block.number, tokenId) &
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) | (1 << 252); // TODO: consider tiers

    tokenTraits[tokenId] = MeowChainUtil.generateTraits(seed);

    tokenId = totalSupply;
    _mint(_account, tokenId);
  }

  //*********************************************************************//
  // ---------------------- Privileged Operations ---------------------- //
  //*********************************************************************//

  function setAssets(Storage _assets) external onlyRole(DEFAULT_ADMIN_ROLE) {
    assets = _assets;
  }
}
