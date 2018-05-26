pragma solidity ^0.4.23;


contract IPFSWrapper {

  struct IPFSMultiHash {
    uint8 hashFunction;
    uint8 digestSize;
    bytes32 hash;
  }

  // CONSTRUCTOR

  constructor () public {

  }

  // INTERNAL FUNCTIONS

  function combineIPFSHash(IPFSMultiHash _multiHash) internal pure returns (bytes) {
    bytes memory out = new bytes(34);

    out[0] = byte(_multiHash.hashFunction);
    out[1] = byte(_multiHash.digestSize);

    uint8 i;
    for (i = 0; i < 32; i++) {
      out[i+2] = _multiHash.hash[i];
    }

    return out;
  }

  function splitIPFSHash(bytes _source) internal pure returns (IPFSMultiHash) {
    uint8 hashFunction = uint8(_source[0]);
    uint8 digestSize = uint8(_source[1]);
    bytes32 hash;

    assembly {
      hash := mload(add(_source, 34))
    }

    return (IPFSMultiHash({
      hashFunction: hashFunction,
      digestSize: digestSize,
      hash: hash
    }));
  }
}
