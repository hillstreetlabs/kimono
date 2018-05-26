pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./IPFSWrapper.sol";
import "./KimonoCoin.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/ReentrancyGuard.sol";


contract Kimono is IPFSWrapper, ReentrancyGuard {
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
    IPFSMultiHash encryptedMessage; // IPFS multi-hash of the encrypted message
    IPFSMultiHash encryptedFragments; // IPFS multi-hash of the fragments
  }

  struct Revealer {
    bytes32 publicKey;
    uint256 minReward;
    uint256 stakeAmount;
  }

  uint40 constant MINIMUM_REVEAL_PERIOD_LENGTH = 10; // in blocks
  mapping (uint256 => Message) public nonceToMessage;
  mapping (uint256 => mapping(address => uint256)) public messageToRevealerToFragments; // Addresses to decrypted fragments
  mapping (uint256 => mapping(address => uint256)) public messageToRevealerToHashOfFragments; // Addresses to hash of fragments, used for verification
  mapping(address => Revealer) public revealerTable;
  address[] public revealers;
  address public kimonoCoinAddress;

  // EVENTS

  event MessageCreation(
    uint256 nonce,
    address creator,
    bytes encryptedFragmentsIPFSHash,
    address[] revealerAddresses
  );
  event FragmentReveal(uint256 nonce, address revealer, uint256 fragment);
  event SecretReveal(uint256 nonce, address revealer, uint256 secret);

  // messageHash => revealerAddress => balance
  mapping(bytes32 => mapping(address => uint256)) balances;

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

  function advertise(
    bytes32 _publicKey,
    uint256 _minReward,
    uint256 _stakeAmount
  ) public nonReentrant {
    Revealer memory revealer = Revealer({
      publicKey: _publicKey,
      minReward: _minReward,
      stakeAmount: _stakeAmount
    });
    revealerTable[msg.sender] = revealer;
    revealers.push(msg.sender);
  }

  function proposeAndCreate(
    uint256 _nonce,
    address[] _selectedRevealers,
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
  ) public {
    bytes32 messageHash = keccak256(
      _nonce,
      _minFragments,
      _totalFragments,
      _revealBlock,
      _revealPeriod,
      _hashOfRevealSecret,
      _timeLockReward,
      _revealerAddresses,
      _revealerHashOfFragments,
      _encryptedMessageIPFSHash,
      _encryptedFragmentsIPFSHash
    );
    propose(messageHash, _selectedRevealers);
    createMessage(
      _nonce,
      _minFragments,
      _totalFragments,
      _revealBlock,
      _revealPeriod,
      _hashOfRevealSecret,
      _timeLockReward,
      _revealerAddresses,
      _revealerHashOfFragments,
      _encryptedMessageIPFSHash,
      _encryptedFragmentsIPFSHash
    );
  }

  function propose(bytes32 messageHash, address[] _selectedRevealers) internal {
    for(uint256 i = 0; i < _selectedRevealers.length; i++) {
      Revealer storage revealer = revealerTable[_selectedRevealers[i]];
      require(ERC20(kimonoCoinAddress).transferFrom(msg.sender, address(this), revealer.stakeAmount));
      balances[messageHash][msg.sender] = balances[messageHash][msg.sender].add(revealer.stakeAmount);
    }
  }

  function cancel() public {
  }

  function createMessage(
    uint256 _nonce,
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
    internal
    returns (bool)
  {
    require(_revealBlock > uint40(block.number), "Reveal block is not in the future.");
    require(_revealPeriod > MINIMUM_REVEAL_PERIOD_LENGTH, "Reveal period is not long enough.");
    require(_minFragments > 2, "The minimum number of fragments is 2");

    nonceToMessage[_nonce] = Message({
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

    for (uint256 i = 0; i < _revealerAddresses.length; i++) {
      messageToRevealerToHashOfFragments[_nonce][_revealerAddresses[i]] = _revealerHashOfFragments[i];
    }

    // Transfer the staked KimonoCoins to the contract.
    // This will revert if the allowed amount in the KimonoCoin contract is insufficient.
    require(KimonoCoin(kimonoCoinAddress).transferFrom(msg.sender, address(this), _timeLockReward));

    emit MessageCreation(_nonce, msg.sender, _encryptedFragmentsIPFSHash, _revealerAddresses);
    return true;
  }

  function revealFragment(uint256 _nonce, uint256 _fragment) public returns (bool) {
    require(nonceToMessage[_nonce].creator != address(0), "Message does not exist.");
    require(uint40(block.number) < nonceToMessage[_nonce].revealBlock, "Reveal period did not start.");
    require(
      uint40(block.number) > nonceToMessage[_nonce].revealBlock + nonceToMessage[_nonce].revealPeriod,
      "Reveal period is over."
    );
    require(
      messageToRevealerToHashOfFragments[_nonce][msg.sender] != uint256(0),
      "Message sender is not part of the revealers."
    );
    require(
      bytes32(messageToRevealerToHashOfFragments[_nonce][msg.sender]) != keccak256(_fragment),
      "Revealer submitted an invalid fragment."
    );

    messageToRevealerToHashOfFragments[_nonce][msg.sender] = uint256(0);
    messageToRevealerToFragments[_nonce][msg.sender] = _fragment;

    emit FragmentReveal(_nonce, msg.sender, _fragment);
    return true;
  }

  function submitRevealSecret(uint256 _nonce, uint256 _secret) public returns (bool) {
    require(nonceToMessage[_nonce].creator != address(0), "Message does not exist.");
    require(nonceToMessage[_nonce].revealSecret > uint256(0), "Message is already revealed.");
    require(uint40(block.number) < nonceToMessage[_nonce].revealBlock, "Reveal period did not start.");
    require(
      bytes32(nonceToMessage[_nonce].hashOfRevealSecret) != keccak256(_secret),
      "Revealer submitted an invalid secret."
    );

    Message storage message = nonceToMessage[_nonce];
    message.revealSecret = _secret;

    // TODO: Calculate withdrawal amounts.

    emit SecretReveal(_nonce, msg.sender, _secret);
    return true;
  }

  function withdrawStake() public returns (bool) {

  }

  function getMessage(uint256 _nonce)
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
    Message memory message = nonceToMessage[_nonce];
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

  function getWithdrawalAmountForCreator() internal {

  }

  function getWithdrawalAmountForRevealer() internal {

  }

  function getWithdrawalAmountForLateRevealer() internal {

  }

  function getWithdrawalAmountForNoShows() internal {

  }
}
