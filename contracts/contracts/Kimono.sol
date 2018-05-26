pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ReentrancyGuard.sol";
import "./AddressArrayUtils.sol";
import "./IPFSWrapper.sol";
import "./KimonoCoin.sol";


contract Kimono is IPFSWrapper, ReentrancyGuard {
  using SafeMath for uint256;
  using AddressArrayUtils for address[];

  enum RevealStatus { OnTime, Late, NoShow }

  struct Message {
    address creator; // Address of the creator of the message
    uint8 minFragments; // K-number of fragments needed to construct the secret
    uint8 totalFragments; // Total number of fragments that will be distributed
    uint40 revealBlock; // Block number for the start of the reveal period
    uint40 revealPeriod; // Length of the period when it's okay to reveal secret fragments
    address secretConstructor; // Address of the constructor of the secret
    bool creatorWithdrewStake; // True if creator withdrew their stake (and punished no-showers)
    bool secretConstructorWithdrewStake; // True if secret constructor withdrew their stake
    uint8 onTimeRevealerCount; // Count of revealers who submitted their fragment before secret construction
    uint256 revealSecret; // Secret that'll be used to decrypt the message
    uint256 hashOfRevealSecret; // Hash of the revealSecret, submitted by the user and used for verification
    uint256 timeLockReward; // Time lock reward staked by the creator of the message
    IPFSMultiHash encryptedMessage; // IPFS multi-hash of the encrypted message
    IPFSMultiHash encryptedFragments; // IPFS multi-hash of the fragments
  }

  struct Revealer {
    bytes32 publicKey;
    uint256 minReward;
    uint256 stakePerMessage;
  }

  uint40 constant MINIMUM_REVEAL_PERIOD_LENGTH = 10; // in blocks

  mapping (uint256 => Message) public nonceToMessage;
  mapping (address => uint256[]) public revealerToMessages;
  mapping (uint256 => address[]) public messageToRevealers;
  mapping (uint256 => mapping(address => uint256)) public messageToRevealerToFragments;
  mapping (uint256 => mapping(address => uint256)) public messageToRevealerToHashOfFragments;
  mapping (uint256 => mapping(address => RevealStatus)) public messageToRevealerToRevealStatus;
  mapping(address => Revealer) public revealerTable;
  mapping(address => uint256) public totalStakes;
  mapping(uint256 => mapping(address => uint256)) public messageToRevealerToStake;

  address[] public eligibleRevealers;
  address public kimonoCoinAddress;

  // EVENTS

  event MessageCreation(
    uint256 nonce,
    address creator,
    bytes encryptedFragmentsIPFSHash,
    address[] revealerAddresses
  );
  event FragmentReveal(
    uint256 nonce,
    address revealer,
    uint256 fragment,
    uint8 minFragments,
    uint8 onTimeRevealerCount
  );
  event SecretReveal(uint256 nonce, address revealer, uint256 secret);
  event StakeWithdrawal(address withdrawer, uint256 amount);
  event TattleTail(address tattler, address tattlee);

  // nonce => revealerAddress => balance

  // CONSTRUCTOR
  constructor (address _kimonoCoinAddress) public {
    kimonoCoinAddress = _kimonoCoinAddress;
  }

  // FALLBACK FUNCTION

  // Do nothing. Intentionally not payable.
  function() public {

  }

  // MODIFIERS

  modifier noDuplicates(address[] addresses) {
    require(!addresses.hasDuplicate());
    _;
  }


  // PUBLIC FUNCTIONS

  function registerRevealer(
    bytes32 _publicKey,
    uint256 _minReward,
    uint256 _stakePerMessage,
    uint256 _totalStake
  ) public nonReentrant {
    // TODO: Can revealer update every single param they have?
    // If not, add a check to make sure msg.sender doesn't exist.

    Revealer memory revealer = Revealer({
      publicKey: _publicKey,
      minReward: _minReward,
      stakePerMessage: _stakePerMessage
    });
    uint256 reservedAmount = getReservedAmount(msg.sender);
    require(_totalStake >= reservedAmount);

    uint256 oldTotalStake = totalStakes[msg.sender];
    if (_totalStake == oldTotalStake) {
    } else if (_totalStake > oldTotalStake) {
      uint256 additionalStakeAmount = _totalStake.sub(oldTotalStake);
      require(KimonoCoin(kimonoCoinAddress).transferFrom(msg.sender, address(this), additionalStakeAmount));
    } else {
      uint256 refundAmount = oldTotalStake.sub(_totalStake);
      require(KimonoCoin(kimonoCoinAddress).transfer(msg.sender, refundAmount));
    }
    totalStakes[msg.sender] = _totalStake;
    revealerTable[msg.sender] = revealer;

    updateEligibleRevealer(msg.sender, reservedAmount, _stakePerMessage);
  }

  function updateEligibleRevealer(address _revealerAddress, uint256 _reservedAmount, uint256 _stakePerMessage) internal {
    uint256 index;
    bool isIn;
    // TODO: update index implementation to search from the end, for revealer
    // that advertises frequently
    (index, isIn) = eligibleRevealers.indexOf(_revealerAddress);
    if (totalStakes[_revealerAddress].sub(_reservedAmount) >= _stakePerMessage) {
      if (!isIn) {
        eligibleRevealers.push(_revealerAddress);
      }
    } else {
      if (isIn) {
        eligibleRevealers.remove(index);
      }
    }
  }

  function getReservedAmount(address _revealer) public returns (uint256) {
    uint256 reservedAmount = 0;
    for(uint256 i = 0; i < revealerToMessages[_revealer].length; i++) {
      uint256 nonce = revealerToMessages[_revealer][i];
      reservedAmount = reservedAmount.add(messageToRevealerToStake[nonce][_revealer]);
    }
    return reservedAmount;
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
    public noDuplicates(_revealerAddresses)
  {
    require(nonceToMessage[_nonce].creator == address(0), "Message exists already.");
    require(_revealBlock > uint40(block.number), "Reveal block is not in the future.");
    require(_revealPeriod > MINIMUM_REVEAL_PERIOD_LENGTH, "Reveal period is not long enough.");
    require(_minFragments > 2, "The minimum number of fragments is 2");

    reserveStakes(_revealerAddresses, _nonce);

    nonceToMessage[_nonce] = Message({
      creator: msg.sender,
      secretConstructor: address(0),
      creatorWithdrewStake: false,
      secretConstructorWithdrewStake: false,
      minFragments: _minFragments,
      totalFragments: _totalFragments,
      onTimeRevealerCount: 0,
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
      messageToRevealerToRevealStatus[_nonce][_revealerAddresses[i]] = RevealStatus.NoShow;
      revealerToMessages[_revealerAddresses[i]].push(_nonce);
    }
    messageToRevealers[_nonce] = _revealerAddresses;

    // Transfer the staked KimonoCoins to the contract.
    // This will revert if the allowed amount in the KimonoCoin contract is insufficient.
    require(KimonoCoin(kimonoCoinAddress).transferFrom(msg.sender, address(this), _timeLockReward));

    emit MessageCreation(_nonce, msg.sender, _encryptedFragmentsIPFSHash, _revealerAddresses);
  }

  function reserveStakes(address[] _revealerAddresses, uint256 _nonce) {
    for(uint256 i = 0; i < _revealerAddresses.length; i++) {
      address revealerAddress = _revealerAddresses[i];
      Revealer storage revealer = revealerTable[revealerAddress];

      uint256 reservedAmount = getReservedAmount(msg.sender);
      require(totalStakes[revealerAddress].sub(reservedAmount) > revealer.stakePerMessage);

      revealerToMessages[revealerAddress].push(_nonce);
      messageToRevealerToStake[_nonce][revealerAddress] = revealer.stakePerMessage;

      updateEligibleRevealer(revealerAddress, reservedAmount, revealer.stakePerMessage);
    }
  }

  function revealFragment(uint256 _nonce, uint256 _fragment) public nonReentrant {
    require(nonceToMessage[_nonce].creator != address(0), "Message does not exist.");
    require(uint40(block.number) > nonceToMessage[_nonce].revealBlock, "Reveal period did not start.");
    require(
      uint40(block.number) < nonceToMessage[_nonce].revealBlock + nonceToMessage[_nonce].revealPeriod,
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

    // Message is not revealed
    if (nonceToMessage[_nonce].secretConstructor == address(0)) {
      messageToRevealerToRevealStatus[_nonce][msg.sender] = RevealStatus.OnTime;
      Message storage message = nonceToMessage[_nonce];
      message.onTimeRevealerCount += 1;
    } else {
      messageToRevealerToRevealStatus[_nonce][msg.sender] = RevealStatus.Late;
    }

    emit FragmentReveal(_nonce, msg.sender, _fragment, message.minFragments, message.onTimeRevealerCount);
  }

  function submitRevealSecret(uint256 _nonce, uint256 _secret) public {
    require(nonceToMessage[_nonce].creator != address(0), "Message does not exist.");
    require(nonceToMessage[_nonce].secretConstructor == address(0), "Message is already revealed.");
    require(uint40(block.number) > nonceToMessage[_nonce].revealBlock, "Reveal period did not start.");
    require(
      bytes32(nonceToMessage[_nonce].hashOfRevealSecret) != keccak256(_secret),
      "Revealer submitted an invalid secret."
    );

    Message storage message = nonceToMessage[_nonce];
    message.revealSecret = _secret;
    message.secretConstructor = msg.sender;

    emit SecretReveal(_nonce, msg.sender, _secret);
  }

  function withdrawStake(uint256 _nonce) public {
    require(nonceToMessage[_nonce].creator != address(0), "Message does not exist.");
    require(
      uint40(block.number) > nonceToMessage[_nonce].revealBlock + nonceToMessage[_nonce].revealPeriod,
      "Reveal period is not over."
    );

    Message storage message = nonceToMessage[_nonce];
    uint256 amount;
    uint256 oldBalance;

    // TODO: If messageToRevealerToStake is updated, should the totalStake be updated as well?

    // Creator
    if (msg.sender == message.creator && !message.creatorWithdrewStake) {
      message.creatorWithdrewStake = true;
      // Calculate the total stake of the NoShows
      for (uint256 i = 0; i < messageToRevealers[_nonce].length; i++) {
        address revealer = messageToRevealers[_nonce][i];
        if (messageToRevealerToRevealStatus[_nonce][revealer] == RevealStatus.NoShow) {
          oldBalance = messageToRevealerToStake[_nonce][revealer];
          messageToRevealerToStake[_nonce][revealer] = 0;
          amount.add(oldBalance);
        }
      }
    }

    // Secret constructor
    if (msg.sender == message.secretConstructor && !message.secretConstructorWithdrewStake) {
      message.secretConstructorWithdrewStake = true;
      amount.add(message.timeLockReward.div(uint256(message.onTimeRevealerCount + 1)));
    }

    // Revealer showed up, so return stake
    // No need to see if msg.sender is part of the revealers. If they are not, their balance will be 0
    if (messageToRevealerToRevealStatus[_nonce][msg.sender] != RevealStatus.NoShow) {
      oldBalance = messageToRevealerToStake[_nonce][msg.sender];
      if (oldBalance > 0) {
        messageToRevealerToStake[_nonce][msg.sender] = 0;
        amount.add(oldBalance);

        // Revealer was on time, so also give the reward
        if (messageToRevealerToRevealStatus[_nonce][msg.sender] == RevealStatus.OnTime) {
          amount.add(message.timeLockReward.div(uint256(message.onTimeRevealerCount + 1)));
        }
      }
    }

    if (amount > 0 ) {
      require(KimonoCoin(kimonoCoinAddress).transfer(msg.sender, amount));
      emit StakeWithdrawal(msg.sender, amount);
    }
  }

  function tattle(address _tattlee, uint256 _nonce, uint256 _fragment) public {
    require(nonceToMessage[_nonce].creator != address(0), "Message does not exist.");
    require(uint40(block.number) < nonceToMessage[_nonce].revealBlock, "Reveal period already started.");
    require(
      bytes32(messageToRevealerToHashOfFragments[_nonce][_tattlee]) != keccak256(_fragment),
      "Revealer submitted an invalid fragment."
    );

    uint256 balance = messageToRevealerToStake[_nonce][_tattlee];
    messageToRevealerToStake[_nonce][_tattlee] = 0;

    messageToRevealerToHashOfFragments[_nonce][_tattlee] = uint256(0);
    messageToRevealerToFragments[_nonce][_tattlee] = _fragment;

    require(KimonoCoin(kimonoCoinAddress).transfer(msg.sender, balance));
    TattleTail(msg.sender, _tattlee);
  }

  function getMessage(uint256 _nonce)
    external
    view
    returns (
      address,
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
      message.secretConstructor,
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

  function getMessageNoncesForRevealer(address _revealer) external view returns (uint256[]) {
    return revealerToMessages[_revealer];
  }

  function getEligibleRevealersCount() external view returns(uint256) {
    return eligibleRevealers.length;
  }
}
