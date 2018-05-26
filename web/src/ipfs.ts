import util from "tweetnacl-util";

const IPFS_RPC_URL = "https://ipfs.infura.io:5001";

export default class IPFS {
  async add(data: Uint8Array) {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([data], { type: "application/octet-stream" })
    );
    const response = await fetch(`${IPFS_RPC_URL}/api/v0/add`, {
      method: "POST",
      body: formData
    });

    const json = await response.json();
    return json.Hash;
  }

  async get(hash: string) {
    const response = await fetch(`${IPFS_RPC_URL}/api/v0/cat?arg=${hash}`);
    return response.arrayBuffer();
  }

  async addJson(data: Object) {
    return this.add(util.decodeUTF8(JSON.stringify(data)));
  }

  async getJson(hash: string) {
    const buffer = await this.get(hash);
    return JSON.parse(util.encodeUTF8(new Uint8Array(buffer)));
  }
}
