import * as crypto from "./crypto";

export type IpfsMultiHash = string[];

export function toIpfsHash(multiHash: IpfsMultiHash) {
  return crypto.bytesToBase58(crypto.hexArrayToBytes(multiHash));
}
