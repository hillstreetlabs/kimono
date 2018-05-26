pragma solidity ^0.4.23;

library AddressArrayUtils {

  /// @return Returns index and isIn for the first occurrence starting from
  /// index 0
  function indexOf(address[] addresses, address a)
    internal pure returns (uint, bool)
  {
    for (uint i = 0; i < addresses.length; i++) {
      if (addresses[i] == a) {
        return (i, true);
      }
    }
    return (0, false);
  }

  /// Deletes address at index and fills the spot with the last address
  /// @return Returns the new array length
  function remove(address[] storage addresses, uint256 index) returns(uint256) {
    if (index >= addresses.length) {
      return addresses.length;
    }
    addresses[index] = addresses[addresses.length - 1];
    delete addresses[addresses.length - 1];
    addresses.length--;
    return addresses.length;
  }

}
