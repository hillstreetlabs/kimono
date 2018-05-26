pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./KimonoCoin.sol";
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
    mapping (address => uint256) revealerToFragments; // Addresses to decrypted fragments
    mapping (address => uint256) revealerToHashOfFragments; // Addresses to hash of fragments, used for verification
    IPFSMultiHash encryptedMessage; // IPFS multi-hash of the encrypted message
    IPFSMultiHash encryptedFragments; // IPFS multi-hash of the fragments
  }

  struct Revealer {
    bytes32 publicKey;
    uint256 minReward;
    uint256 stake;
  }

  uint40 constant MINIMUM_REVEAL_PERIOD_LENGTH = 10; // in blocks
  Message[] public messages;
  mapping(address => Revealer) revealerTable;
  address[] revealers;
  address kimonoCoinAddress;

  // EVENTS

  event MessageCreation(
    uint256 messageId,
    address creator,
    address[] revealerAddresses,
    bytes encryptedFragmentsIPFSHash
  );
  event FragmentReveal(uint256 messageId, address revealer, uint256 fragment);

  // CONSTRUCTOR

  constructor (address _kimonoCoinAddress) public {
    kimonoCoinAddress = _kimonoCoinAddress;
    KimonoCoin(kimonoCoinAddress).approveAll(address(this));
  }

  // FALLBACK FUNCTION

  // Do nothing. Intentionally not payable.
  function() public {

  }

  // PUBLIC FUNCTIONS

  function advertise() public {
    // take stake
  }

  function cancel() public {
  }

  function createMessage(
    uint8 _minFragments,
    uint8 _totalFragments,
    uint40 _revealBlock,
    uint40 _revealPeriod,
    uint256 _hashOfRevealSecret,
    uint256 _timeLockReward,
    address[] _revealerAddresses,
    uint256[] _revealerHashOfFragments,
    bytes _encryptedMessageIPFSHash,
    bytes _encryptedFragmentsIPFSHash
  )
    public
    returns (uint256)
  {
    require(_revealBlock > uint40(block.number), "Reveal block is not in the future.");
    require(_revealPeriod > MINIMUM_REVEAL_PERIOD_LENGTH, "Reveal period is not long enough.");
    // TODO: Add some form of validation for minFragments and totalFragments

    Message memory message = Message({
      creator: msg.sender,
      minFragments: _minFragments,
      totalFragments: _totalFragments,
      revealBlock: _revealBlock,
      revealPeriod: _revealPeriod,
      revealSecret: uint256(0),
      hashOfRevealSecret: _hashOfRevealSecret,
      timeLockReward: _timeLockReward,
      encryptedMessage: splitIPFSHash(_encryptedMessageIPFSHash),
      encryptedFragments: splitIPFSHash(_encryptedFragmentsIPFSHash)
    });

    // for (uint256 i = 0; i < _revealerAddresses.length; i++) {
    //   message.revealerToHashOfFragments[_revealerAddresses[i]] = _revealerHashOfFragments[i];
    // }

    uint64 messageId = uint64(messages.push(message) - 1);

    // Transfer the staked KimonoCoins to the contract.
    // This will revert if the allowed amount in the KimonoCoin contract is insufficient.
    require(KimonoCoin(kimonoCoinAddress).transferFrom(msg.sender, address(this), _timeLockReward));

    emit MessageCreation(messageId, msg.sender, _revealerAddresses, _encryptedFragmentsIPFSHash);
    return messageId;
  }

  function revealFragment(uint256 _messageId, uint256 _fragment) returns (bool) {
    require(_messageId.add(1) <= messages.length, "Message does not exist.");
    require(uint40(block.number) > messages[_messageId].revealBlock, "Reveal block is in the future.");
    require(
      uint40(block.number) < messages[_messageId].revealBlock + messages[_messageId].revealPeriod,
      "Reveal period is over."
    );
    require(
      messages[_messageId].revealerToHashOfFragments[msg.sender] != uint256(0),
      "Message sender is not part of the revealers."
    );
    // require(
    //   messages[_messageId].revealerToHashOfFragments[msg.sender] != keccak256(_fragment),
    //   "Revealer submitted the wrong fragment."
    // );

    emit FragmentReveal(_messageId, msg.sender, _fragment);
    return true;
  }

  function revealSecret() returns (bool) {

  }

  function withdrawStake() returns (bool) {

  }

  function getMessage(uint256 _messageId)
    external
    view
    returns (
      address,
      uint8,
      uint8,
      uint40,
      uint40,
      uint256,
      uint256,
      uint256,
      bytes,
      bytes
    )
  {
    Message memory message = messages[_messageId];
    return (
      message.creator,
      message.minFragments,
      message.totalFragments,
      message.revealBlock,
      message.revealPeriod,
      message.revealSecret,
      message.hashOfRevealSecret,
      message.timeLockReward,
      combineIPFSHash(message.encryptedMessage),
      combineIPFSHash(message.encryptedFragments)
    );
  }
}
