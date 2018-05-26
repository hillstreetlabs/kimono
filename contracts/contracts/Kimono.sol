pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./IPFSWrapper.sol";


contract Kimono is IPFSWrapper {
  using SafeMath for uint256;

  struct Message {
    address creator; // Address of the creator of the message
    uint8 minFragments; // K-number of fragments needed to construct the secret
    uint8 totalFragments; // Total number of fragments that will be distributed
    uint40 revealBlock; // Block number for the start of the reveal period
    uint40 revealPeriod; // Length of the period when it's okay to reveal secret fragments
    uint256 revealSecret; // Secret that'll be used to decrypt the message
    uint256 hashOfRevealSecret; // Hash of the revealSecret, submitted by the user and used for verification
    uint256 timeLockReward; // Time lock reward staked by the creator of the message
    mapping (address => uint256) revealerToHashOfFragments; // Addresses to hash of fragments, used for verification
    IPFSMultiHash encryptedMessage; // IPFS multi-hash of the encrypted message
    IPFSMultiHash encryptedFragments; // IPFS multi-hash of the fragments
  }

  Message[] public messages;


  // CONSTRUCTOR

  constructor () public {

  }

  // FALLBACK FUNCTION

  // Do nothing. Intentionally not payable.
  function() public {

  }
}
