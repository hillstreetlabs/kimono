import BN from "bn.js";
import * as crypto from "./util/crypto";
import { IpfsMultiHash, toIpfsHash } from "./util/ipfs";

export interface IContractMessage {
  creator: string;
  minFragments: BN;
  totalFragments: BN;
  revealBlock: BN;
  revealPeriod: BN;
  revealSecret: BN;
  hashOfRevealSecret: BN;
  timeLockReward: BN;
  encryptedMessage: IpfsMultiHash;
  encryptedFragments: IpfsMultiHash;
}

export default class Message {
  creator: string; // Address of the creator of the message
  minFragments: number; // K-number of fragments needed to construct the secret
  totalFragments: number; // Total number of fragments that will be distributed
  revealBlock: number; // Block number for the start of the reveal period
  revealPeriod: number; // Length of the period when it's okay to reveal secret fragments
  revealSecret: Uint8Array; // Secret that'll be used to decrypt the message
  hashOfRevealSecret: Uint8Array; // Hash of the revealSecret, submitted by the user and used for verification
  timeLockReward: BN; // Time lock reward staked by the creator of the message
  encryptedMessage: string; // IPFS multi-hash of the encrypted message
  encryptedFragments: string; // IPFS multi-hash of the fragments

  constructor(message: Partial<Message>) {
    if (message.creator) this.creator = message.creator;
  }

  static fromContract(contractMessage: IContractMessage) {
    return new Message({
      creator: contractMessage.creator,
      minFragments: contractMessage.minFragments.toNumber(),
      totalFragments: contractMessage.totalFragments.toNumber(),
      revealBlock: contractMessage.revealBlock.toNumber(),
      revealPeriod: contractMessage.revealPeriod.toNumber(),
      revealSecret: crypto.bnToBytes(contractMessage.revealSecret, 32),
      hashOfRevealSecret: crypto.bnToBytes(
        contractMessage.hashOfRevealSecret,
        32
      ),
      timeLockReward: contractMessage.timeLockReward,
      encryptedMessage: toIpfsHash(contractMessage.encryptedMessage),
      encryptedFragments: toIpfsHash(contractMessage.encryptedFragments)
    });
  }
}
