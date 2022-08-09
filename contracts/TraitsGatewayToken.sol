// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.6;

import './libraries/MeowGatewayUtil.sol';
import './Token.sol';

contract TraitsGatewayToken is Token {
    using Strings for uint256;

  //*********************************************************************//
  // --------------------- public stored properties -------------------- //
  //*********************************************************************//

  /**
    @notice HTTP IPFS gateway to use for token content generation.

    @dev Because token content is dynamically generated, there is no static token URI, instead data is packaged into an svg that is returned directly by the contract. 
  */
  string ipfsGateway;

  /**
    @notice IPFS root CID containing NFT image assets.
  */
  string ipfsRoot;

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
    @param _ipfsGateway HTTP IPFS gateway
    @param _ipfsRoot IPFS CID
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
    string memory _ipfsGateway,
    string memory _ipfsRoot
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
    ipfsGateway = _ipfsGateway;
    ipfsRoot = _ipfsRoot;
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
        return MeowGatewayUtil.dataUri(ipfsGateway, ipfsRoot, traits, name, _tokenId);
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

    uint256 accountBalance = balanceOf(msg.sender);
    if (accountBalance == mintAllowance) {
      revert ALLOWANCE_EXHAUSTED();
    }

    // TODO: consider beaking this out
    uint256 expectedPrice;
    if (accountBalance != 0 && accountBalance != 2 && accountBalance != 4) {
      expectedPrice = accountBalance * unitPrice;
    }
    if (msg.value != expectedPrice) {
      revert INCORRECT_PAYMENT(expectedPrice);
    }

    if (msg.value > 0) {
      // NOTE: move funds to jbx project
      IJBPaymentTerminal terminal = jbxDirectory.primaryTerminalOf(jbxProjectId, JBTokens.ETH);
      if (address(terminal) == address(0)) {
        revert PAYMENT_FAILURE();
      }

      terminal.pay(
        jbxProjectId,
        msg.value,
        JBTokens.ETH,
        msg.sender,
        0,
        false,
        string(
          abi.encodePacked(
            'at ',
            block.number.toString(),
            ' ',
            msg.sender,
            ' purchased a kitty cat for ',
            msg.value.toString()
          )
        ),
        abi.encodePacked('MEOWsDAO Progeny Noun Token Minted at ', block.timestamp.toString(), '.')
      );
    }

    unchecked {
      ++totalSupply;
    }
    tokenId = totalSupply;

    uint256 seed = (MeowGatewayUtil.generateSeed(msg.sender, block.number, tokenId) &
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) | (1 << 252); // TODO: consider tiers

    tokenTraits[tokenId] = MeowGatewayUtil.generateTraits(seed);

    _mint(msg.sender, tokenId);
  }

  //*********************************************************************//
  // ---------------------- Privileged Operations ---------------------- //
  //*********************************************************************//

  function setIPFSGatewayURI(string calldata _uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
    ipfsGateway = _uri;
  }

  function setIPFSRoot(string calldata _root) external onlyRole(DEFAULT_ADMIN_ROLE) {
    ipfsRoot = _root;
  }
}
