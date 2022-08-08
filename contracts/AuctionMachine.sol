// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.6;

import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBDirectory.sol';
import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBPaymentTerminal.sol';
import '@jbx-protocol/contracts-v2/contracts/libraries/JBTokens.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

import './Token.sol';

contract AuctionMachine is Ownable, ReentrancyGuard {
  error INVALID_DURATION();
  error INVALID_BID();
  error AUCTION_ENDED();
  error SUPPLY_EXHAUSTED();
  error AUCTION_ACTIVE();

  uint256 public maxAuctions;

  /** @notice Duration of auctions in seconds. */
  uint256 public auctionDuration;

  /** @notice Juicebox project id that will receive auction proceeds */
  uint256 public jbxProjectId;

  /** @notice Juicebox terminal for send proceeds to */
  IJBDirectory public jbxDirectory;

  Token public token;

  uint256 public completedAuctions;

  /** @notice Current auction ending time. */
  uint256 public auctionExpiration;

  uint256 public currentTokenId;

  /** @notice Current highest bid. */
  uint256 public currentBid;

  /** @notice Current highest bidder. */
  address public currentBidder;

  event Bid(address indexed bidder, uint256 amount, address token, uint256 tokenId);
  event AuctionStarted(uint256 expiration, address token, uint256 tokenId);
  event AuctionEnded(address winner, uint256 price, address token, uint256 tokenId);

  constructor(
    uint256 _maxAuctions,
    uint256 _auctionDuration,
    uint256 _projectId,
    IJBDirectory _jbxDirectory,
    Token _token
  ) {
    if (_auctionDuration == 0) {
      revert INVALID_DURATION();
    }

    maxAuctions = _maxAuctions;
    auctionDuration = _auctionDuration;
    jbxProjectId = _projectId;
    jbxDirectory = _jbxDirectory;
    token = _token;
  }

  //*********************************************************************//
  // ---------------------- external transactions ---------------------- //
  //*********************************************************************//

  function bid() external payable nonReentrant {
    if (currentBidder == address(0) && currentBid == 0 && currentTokenId == 0) {
      // no auction, create new

      startNewAuction();
    } else if (currentBid >= msg.value || msg.value < token.unitPrice()) {
      revert INVALID_BID();
    } else if (auctionExpiration > block.timestamp && currentBid < msg.value) {
      // new high bid

      payable(currentBidder).transfer(currentBid); // TODO: check success
      currentBidder = msg.sender;
      currentBid = msg.value;

      emit Bid(msg.sender, msg.value, address(token), currentTokenId);
    } else {
      revert AUCTION_ENDED();
    }
  }

  function settle() external payable nonReentrant {
    if (auctionExpiration > block.timestamp) {
      revert AUCTION_ACTIVE();
    }

    if (currentBidder != address(0)) {
      // auction concluded with bids, settle

      IJBPaymentTerminal terminal = jbxDirectory.primaryTerminalOf(jbxProjectId, JBTokens.ETH);
      terminal.pay(
        jbxProjectId,
        currentBid,
        JBTokens.ETH,
        currentBidder,
        0,
        false,
        string(abi.encodePacked('')),
        ''
      ); // TODO: send relevant memo to terminal

      unchecked {
        ++completedAuctions;
      }
      token.transferFrom(address(this), currentBidder, currentTokenId);

      emit AuctionEnded(currentBidder, currentBid, address(token), currentTokenId);
    } else {
      // auction concluded without bids

      unchecked {
        ++completedAuctions;
      }
    }

      currentBidder = address(0);
      currentBid = 0;
      currentTokenId = 0;

    if (maxAuctions == 0 || completedAuctions + 1 <= maxAuctions) {
      startNewAuction();
    }
  }

  function timeLeft() public view returns (uint256) {
    if (block.timestamp > auctionExpiration) {
      return 0;
    }

    return auctionExpiration - block.timestamp;
  }

  //*********************************************************************//
  // -------------------- priviledged transactions --------------------- //
  //*********************************************************************//

  function recoverToken(address _account, uint256 _tokenId) external nonReentrant onlyOwner {
    token.transferFrom(address(this), _account, _tokenId);
  }

  function startNewAuction() private {
    if (maxAuctions != 0 && completedAuctions == maxAuctions) {
      revert SUPPLY_EXHAUSTED();
    }

    currentTokenId = token.mintFor(address(this));

    if (msg.value >= token.unitPrice()) {
      currentBidder = msg.sender;
      currentBid = msg.value;
      emit Bid(msg.sender, msg.value, address(token), currentTokenId);
    } else {
      currentBidder = address(0);
      currentBid = 0;
    }
    auctionExpiration = block.timestamp + auctionDuration;

    emit AuctionStarted(auctionExpiration, address(token), currentTokenId);
  }
}
