pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "./AddressArrayUtils.sol";
import "./IPFSWrapper.sol";
import "./KimonoCoin.sol";


contract Kimono is IPFSWrapper, ReentrancyGuard {
  using SafeMath for uint256;
  using AddressArrayUtils for address[];

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
    uint256 stakeOffer;
  }

  uint40 constant MINIMUM_REVEAL_PERIOD_LENGTH = 10; // in blocks
  mapping (uint256 => Message) public nonceToMessage;
  mapping (uint256 => mapping(address => uint256)) public messageToRevealerToFragments; // Addresses to decrypted fragments
  mapping (uint256 => mapping(address => uint256)) public messageToRevealerToHashOfFragments; // Addresses to hash of fragments, used for verification
  mapping(address => Revealer) public revealerTable;
  mapping(address => uint256) public totalStakes;
  mapping(address => uint256[]) revealerToJobs;
  // Or should it be revealer => job => stake?
  mapping(uint256 => mapping(address => uint256)) jobToRevealerToStake;

  address[] public eligibleRevealers;
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

  // nonce => revealerAddress => balance

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

  function registerRevealer(
    bytes32 _publicKey,
    uint256 _minReward,
    uint256 _stakeOffer,
    uint256 _totalStake
  ) public nonReentrant {
    Revealer memory revealer = Revealer({
      publicKey: _publicKey,
      minReward: _minReward,
      stakeOffer: _stakeOffer
    });
    uint256 reservedAmount = getReservedAmount(msg.sender);
    require(_totalStake >= reservedAmount);

    uint256 oldTotalStake = totalStakes[msg.sender];
    if (_totalStake == oldTotalStake) {
    } else if (_totalStake > oldTotalStake) {
      uint256 additionalStakeAmount = _totalStake.sub(oldTotalStake);
      require(ERC20(kimonoCoinAddress).transferFrom(msg.sender, address(this), additionalStakeAmount));
    } else {
      uint256 refundAmount = oldTotalStake.sub(_totalStake);
      require(ERC20(kimonoCoinAddress).transfer(msg.sender, refundAmount));
    }
    totalStakes[msg.sender] = _totalStake;
    revealerTable[msg.sender] = revealer;

    uint256 index;
    bool isIn;
    // TODO: update index implementation to search from the end, for revealer
    // that advertises frequently
    (index, isIn) = eligibleRevealers.indexOf(msg.sender);
    if (totalStakes[msg.sender].sub(reservedAmount) >= _stakeOffer) {
      if (!isIn) {
        eligibleRevealers.push(msg.sender);
      }
    } else {
      if (isIn) {
        eligibleRevealers.remove(index);
      }
    }
  }

  function getReservedAmount(address _revealer) returns (uint256) {
    uint256 reservedAmount = 0;
    for(uint256 i = 0; i < revealerToJobs[_revealer].length; i++) {
      uint256 job = revealerToJobs[_revealer][i];
      reservedAmount = reservedAmount.add(jobToRevealerToStake[job][_revealer]);
    }
    return reservedAmount;
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
    propose(_nonce, _selectedRevealers);
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

  function propose(uint256 _nonce, address[] _selectedRevealers) internal {
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
    require(nonceToMessage[_nonce].creator == address(0), "Message exists already.");
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

  function withdrawStake(uint256 _nonce) public returns (bool) {

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

  function getWithdrawalAmountForCreator() internal returns (uint256) {

  }

  function getWithdrawalAmountForRevealer() internal returns (uint256) {

  }

  function getWithdrawalAmountForLateRevealer() internal returns (uint256) {

  }

  function getWithdrawalAmountForNoShows() internal returns (uint256) {

  }

  function getEligibleRevealersCount() external view returns(uint256) {
    return eligibleRevealers.length;
  }


}
