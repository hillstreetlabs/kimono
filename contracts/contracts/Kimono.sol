pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract Kimono {
  using SafeMath for uint256;

  struct Revealer {
    bytes32 publicKey;
    uint256 minReward;
    uint256 stake;
  }

  mapping(address => Revealer) revealerTable;
  address[] revealers;
  address kimonoToken;

  // CONSTRUCTOR

  constructor () public {

  }


  function advertise() public {
    // take stake
  }

  function cancel() public {
  }

  // FALLBACK FUNCTION

  // Do nothing. Intentionally not payable.
  function() public {

  }
}
