pragma solidity ^0.4.23;

library AddressArrayUtils {

  /// @return Returns index and isIn for the first occurrence starting from
  /// index 0
  function indexOf(address[] addresses, address a) internal pure returns (uint, bool) {
    for (uint i = 0; i < addresses.length; i++) {
      if (addresses[i] == a) {
        return (i, true);
      }
    }
    return (0, false);
  }

  /// Deletes address at index and fills the spot with the last address
  /// @return Returns the new array length
  function remove(address[] storage addresses, uint256 index) internal returns (uint256) {
    if (index >= addresses.length) {
      return addresses.length;
    }
    addresses[index] = addresses[addresses.length - 1];
    delete addresses[addresses.length - 1];
    addresses.length--;
    return addresses.length;
  }

  /**
   * Returns whether or not there's a duplicate
   * Runs in O(n^2)
   */
  function hasDuplicate(address[] addresses) returns (bool) {
    for (uint256 i = 0; i < addresses.length - 1; i++) {
      for (uint256 j = i + 1; j < addresses.length; j++) {
        if (addresses[i] == addresses[j]) {
          return false;
        }
      }
    }
    return true;
  }

}
