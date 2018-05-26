import "truffle/Assert.sol";

import "../contracts/AddressArrayUtils.sol";


contract TestAddressArrayUtils {

  address[] addresses;

  function beforeEach() public {
    addresses.length = 0;
  }

  function testHasDuplicateWithDuplicate() public {
    addresses.push(0x1);
    addresses.push(0x1);
    addresses.push(0x3);
    addresses.push(0x4);
    bool hasDuplicate = AddressArrayUtils.hasDuplicate(addresses);
    Assert.equal(hasDuplicate, true, 'should be a duplicate');
  }

  function testHasDuplicateWithNoDuplicate() public {
    addresses.push(0x1);
    addresses.push(0x2);
    addresses.push(0x3);
    addresses.push(0x4);
    bool hasDuplicate = AddressArrayUtils.hasDuplicate(addresses);
    Assert.equal(hasDuplicate, false, 'should be no duplicates');
  }

}
