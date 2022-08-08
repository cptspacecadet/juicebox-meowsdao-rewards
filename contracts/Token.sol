// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.6;

import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBDirectory.sol';
import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBPaymentTerminal.sol';
import '@jbx-protocol/contracts-v2/contracts/libraries/JBTokens.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Strings.sol';
import '@rari-capital/solmate/src/tokens/ERC721.sol';

contract Token is ERC721, AccessControl, ReentrancyGuard {
  using Strings for uint256;

  bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');

  /**
    @notice NFT provenance hash reassignment prohibited.
   */
  error PROVENANCE_REASSIGNMENT();

  /**
    @notice Base URI assignment along with the "revealed" flag can only be done once.
   */
  error ALREADY_REVEALED();

  /**
    @notice User mint allowance exhausted.
   */
  error ALLOWANCE_EXHAUSTED();

  /**
    @notice mint() function received an incorrect payment, expected payment returned as argument.
   */
  error INCORRECT_PAYMENT(uint256);

  /**
    @notice Token supply exhausted, all tokens have been minted.
   */
  error SUPPLY_EXHAUSTED();

  /**
    @notice Various payment failures caused by incorrect contract condiguration.
   */
  error PAYMENT_FAILURE();

  error MINT_NOT_STARTED();
  error MINT_CONCLUDED();

  modifier onlyDuringMintPeriod() {
    if (mintPeriodStart != 0 && mintPeriodStart > block.timestamp) {
      revert MINT_NOT_STARTED();
    }

    if (mintPeriodEnd != 0 && mintPeriodEnd < block.timestamp) {
      revert MINT_CONCLUDED();
    }

    _;
  }

  IJBDirectory jbxDirectory;
  uint256 jbxProjectId;

  string public baseUri;
  string public contractUri;
  uint256 public maxSupply;
  uint256 public unitPrice;
  uint256 public immutable mintAllowance;
  string public provenanceHash;
  mapping(address => bool) public acceptableTokens;
  bool immediateTokenLiquidation;
  uint256 tokenPriceMargin = 10_000; // in bps
  uint128 public mintPeriodStart;
  uint128 public mintPeriodEnd;

  mapping(address => uint256) public claimedMerkleAllowance;
  uint256 public totalSupply;

  /**
    @notice Revealed flag.

    @dev changes the way tokenUri(uint256) works.
   */
  bool public isRevealed;

  /**
    @notice Pause minting flag
   */
  bool public isPaused;

  //*********************************************************************//
  // -------------------------- constructor ---------------------------- //
  //*********************************************************************//

  /**
    @notice Creates the NFT contract.

    @param _name Token name.
    @param _symbol Token symbol
    @param _baseUri Base URI, initially expected to point at generic, "unrevealed" metadata json.
    @param _contractUri OpenSea-style contract metadata URI.
    @param _jbxProjectId Juicebox project id that will be paid the proceeds of the sale.
    @param _jbxDirectory Juicebox directory to determine payment destination.
    @param _maxSupply Max NFT supply.
    @param _unitPrice Price per token expressed in Ether.
    @param _mintAllowance Per-user mint cap.
    @param _mintPeriodStart Start of the minting period in seconds.
    @param _mintPeriodEnd End of the minting period in seconds.
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
    uint128 _mintPeriodStart,
    uint128 _mintPeriodEnd
  ) ERC721(_name, _symbol) {
    baseUri = _baseUri;
    contractUri = _contractUri;
    jbxDirectory = _jbxDirectory;
    jbxProjectId = _jbxProjectId;
    maxSupply = _maxSupply;
    unitPrice = _unitPrice;
    mintAllowance = _mintAllowance;
    mintPeriodStart = _mintPeriodStart;
    mintPeriodEnd = _mintPeriodEnd;

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(MINTER_ROLE, msg.sender);
  }

  //*********************************************************************//
  // ------------------------- external views -------------------------- //
  //*********************************************************************//

  /**
    @notice Get contract metadata to make OpenSea happy.
    */
  function contractURI() public view returns (string memory) {
    return contractUri;
  }

  /**
    @dev If the token has been set as "revealed", returned uri will append the token id
    */
  function tokenURI(uint256 _tokenId) virtual public view override returns (string memory uri) {
    uri = !isRevealed ? baseUri : string(abi.encodePacked(baseUri, _tokenId.toString()));
  }

  //*********************************************************************//
  // ---------------------- external transactions ---------------------- //
  //*********************************************************************//

  /**
    @notice Mints a token to the calling account. Must be paid in Ether if price is non-zero.

    @dev Proceeds are forwarded to the default jbx terminal for the project id set in the constructor. Payment will fail if the terminal is not set in the jbx directory.
   */
  function mint() virtual external payable nonReentrant onlyDuringMintPeriod returns (uint256 tokenId) {
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
    _mint(msg.sender, totalSupply);
  }

  //*********************************************************************//
  // -------------------- priviledged transactions --------------------- //
  //*********************************************************************//

  function mintFor(address _account) virtual external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
    unchecked {
      ++totalSupply;
    }
    tokenId = totalSupply;
    _mint(_account, tokenId);
    
  }

  function setPause(bool pause) external onlyRole(DEFAULT_ADMIN_ROLE) {
    isPaused = pause;
  }

  function addMinter(address _account) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _grantRole(MINTER_ROLE, _account);
  }

  function removeMinter(address _account) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _revokeRole(MINTER_ROLE, _account);
  }

  /**
    @notice Set provenance hash.

    @dev This operation can only be executed once.
   */
  function setProvenanceHash(string memory _provenanceHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
    if (bytes(provenanceHash).length != 0) {
      revert PROVENANCE_REASSIGNMENT();
    }
    provenanceHash = _provenanceHash;
  }

  /**
    @notice Metadata URI for token details in OpenSea format.
   */
  function setContractURI(string memory _contractUri) external onlyRole(DEFAULT_ADMIN_ROLE) {
    contractUri = _contractUri;
  }

  /**
    @notice Allows adjustment of minting period.

    @param _mintPeriodStart New minting period start.
    @param _mintPeriodEnd New minting period end.
   */
  function updateMintPeriod(uint128 _mintPeriodStart, uint128 _mintPeriodEnd) external onlyRole(DEFAULT_ADMIN_ROLE) {
    mintPeriodStart = _mintPeriodStart;
    mintPeriodEnd = _mintPeriodEnd;
  }

  function updateUnitPrice(uint256 _unitPrice) external onlyRole(DEFAULT_ADMIN_ROLE) {
    unitPrice = _unitPrice;
  }

  /**
    @notice Set NFT metadata base URI.

    @dev URI must include the trailing slash.
    */
  function setBaseURI(string memory _baseUri, bool _reveal) external onlyRole(DEFAULT_ADMIN_ROLE) {
    if (isRevealed && !_reveal) {
      revert ALREADY_REVEALED();
    }

    baseUri = _baseUri;
    isRevealed = _reveal;
  }

  function supportsInterface(bytes4 interfaceId) public view override(AccessControl, ERC721) returns (bool) {
    return AccessControl.supportsInterface(interfaceId)
        || ERC721.supportsInterface(interfaceId);
  }
}
