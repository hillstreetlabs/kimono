import * as crypto from "./crypto";
import fetch from "node-fetch";
import FormData from "form-data";

export type IpfsMultiHash = string;

export function toIpfsHash(multiHash: IpfsMultiHash) {
  return crypto.bytesToBase58(crypto.hexToBytes(multiHash));
}

import util from "tweetnacl-util";

const IPFS_RPC_URL = "https://ipfs.infura.io:5001";

export async function add(data: Uint8Array) {
  const formData = new FormData();
  formData.append("file", new Buffer(data));
  const response = await fetch(`${IPFS_RPC_URL}/api/v0/add`, {
    method: "POST",
    body: formData
  });

  const json = await response.json();
  return json.Hash;
}

export async function get(hash: string) {
  const response = await fetch(`${IPFS_RPC_URL}/api/v0/cat?arg=${hash}`);
  return response.arrayBuffer();
}

export async function addJson(data: Object) {
  return this.add(util.decodeUTF8(JSON.stringify(data)));
}

export async function getJson(hash: string) {
  const buffer = await this.get(hash);
  return JSON.parse(util.encodeUTF8(new Uint8Array(buffer)));
}
