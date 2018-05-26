pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";


contract KimonoCoin is MintableToken, BurnableToken {
  string constant public name = "Kimono Coin"; // solium-disable-line uppercase
  string constant public symbol = "OPEN"; // solium-disable-line uppercase
  uint8 constant public decimals = 18; // solium-disable-line uppercase

  uint256 constant MAX_UINT = 2**256 - 1;

  // EVENTS

  event ApproveAll(address sender, address spender);
  event TestingDistributeTokens(address account, uint256 amount);


  // CONSTRUCTOR

  constructor () public {

  }

  // FALLBACK function

  // Do nothing. Intentionally not payable.
  function() public {

  }

  // PUBLIC FUNCTIONS

  function approveAll(address _spender) public returns (bool) {
    allowed[msg.sender][_spender] = MAX_UINT;
    emit ApproveAll(msg.sender, _spender);
    return true;
  }

  function transferFrom(address _from, address _to, uint _value)
    public
    returns (bool)
  {
    uint allowance = allowed[_from][msg.sender];
    require(balances[_from] >= _value && allowance >= _value && balances[_to] + _value >= balances[_to]);
    balances[_to] += _value;
    balances[_from] -= _value;
    if (allowance < MAX_UINT) {
      allowed[_from][msg.sender] -= _value;
    }
    emit Transfer(_from, _to, _value);
    return true;
  }

  // FUNCTIONS FOR TESTING PURPOSES

  function distributeTokensForTesting(address[] _accounts, uint256 _amount)
    public
    onlyOwner
    canMint
    returns (bool)
  {
    for (uint i = 0; i < _accounts.length; i++) {
      address to = _accounts[i];
      mint(to, _amount);
      emit TestingDistributeTokens(to, _amount);
    }
    return true;
  }
}
