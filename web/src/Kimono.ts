import Eth from "ethjs-query";
import HttpProvider from "ethjs-provider-http";
import EthContract from "ethjs-contract";
import IPFS from "./ipfs";
import KimonoBuild from "../../contracts/build/contracts/Kimono.json";
import * as crypto from "./crypto";
import BN from "bn.js";

interface KimonoContract {
  createMessage: (
    nonce: string,
    minFragments: number,
    totalFragments: number,
    revealBlock: number,
    revealPeriod: number,
    hashOfRevealSecret: string,
    timeLockReward: BN,
    revealerAddresses: string[],
    revealerHashOfFragments: string[],
    encryptedMessageIPFSHash: string,
    encryptedFragmentsIPFSHash: string,
    opts?: any
  ) => Promise<string>;
  getEligibleRevealersCount: () => Promise<any>;
  eligibleRevealers(i: number): Promise<any>;
  address: string;
}

export default class Kimono {
  eth: Eth;
  kimono: KimonoContract;
  ipfs: IPFS;

  constructor(provider: HttpProvider, kimonoAddress: string) {
    // Check web3 provider
    if (!provider)
      throw new Error(
        "web3 provider must be specified (e.g. `new Kimono(new HttpProvider('http://localhost:8545'))`)"
      );
    this.eth = new Eth(provider);
    this.ipfs = new IPFS();
    this.kimono = EthContract(this.eth)<KimonoContract>(KimonoBuild.abi).at(
      kimonoAddress
    );
    console.log(this);
  }

  get address() {
    return this.kimono.address;
  }

  async getEligibleRevealers() {
    // TODO: return revealers from contract that fit criteria
    const eligibleRevealers = (await this.kimono.getEligibleRevealersCount())[0];
    console.log("Eligible revealers:", eligibleRevealers.toString());
    const revealerAddresses = new Array(eligibleRevealers).fill(undefined);
    for (let i = 0; i < eligibleRevealers; i++) {
      const response = await this.kimono.eligibleRevealers(i);
      revealerAddresses[i] = response[0];
    }
    return revealerAddresses;
  }

  async createMessage(
    secretKey: string,
    content: string,
    revealAtBlock: number,
    reward: BN,
    minFragments: number,
    totalFragments: number,
    props?: Object
  ) {
    const allAddresses = await this.getEligibleRevealers();
    const revealerAddresses = allAddresses.slice(0, totalFragments);
    console.log("Revealers", revealerAddresses);
    const nonce = crypto.createNonce();
    const secret = crypto.buildMessageSecret(
      nonce,
      crypto.hexToBytes(secretKey)
    );
    const shares = crypto.createSecretFragments(
      secret,
      totalFragments,
      minFragments
    );
    console.log("shares", shares);
    // TODO: Encrypt and hash shares
    const revealerHashOfFragments = shares.map((share: string, i: number) => {
      console.log("address", revealerAddresses[i], i);
      return crypto.bytesToHex(crypto.sha3(crypto.hexToBytes(share)));
    });
    console.log(revealerHashOfFragments);
    // const fragmentsIpfsHash = await this.ipfs.add("foo");
    // console.log("fragments IPFS", fragmentsIpfsHash);
    // Deal with content
    const encryptedContent = crypto.encryptMessage(content, nonce, secret);
    const contentIpfsHash = await this.ipfs.add(encryptedContent);
    console.log("content IPFS", contentIpfsHash);
    // const uploadedContent = await this.ipfs.get(ipfsHash);
    // console.log("uploadedContent", uploadedContent);
    // const reconstructedSecret = crypto.combineSecretFragments(shares);
    // console.log("reconstructed", reconstructedSecret);
    // const decrypted = await crypto.decryptMessage(
    //   new Uint8Array(uploadedContent),
    //   nonce,
    //   crypto.hexToBytes(reconstructedSecret)
    // );
    // console.log("Decrypted", decrypted);
    console.log(
      "args",
      crypto.bytesToHex(nonce),
      minFragments,
      totalFragments,
      revealAtBlock,
      11,
      crypto.bytesToHex(crypto.sha3(secret)),
      reward,
      revealerAddresses,
      revealerHashOfFragments,
      crypto.bytesToHex(crypto.base58ToBytes(contentIpfsHash)),
      crypto.bytesToHex(crypto.base58ToBytes(contentIpfsHash)),
      props || {}
    );
    const transactionHash = await this.kimono.createMessage(
      crypto.bytesToHex(nonce),
      minFragments,
      totalFragments,
      revealAtBlock,
      11,
      crypto.bytesToHex(crypto.sha3(secret)),
      reward,
      revealerAddresses,
      revealerHashOfFragments,
      crypto.bytesToHex(crypto.base58ToBytes(contentIpfsHash)),
      crypto.bytesToHex(crypto.base58ToBytes(contentIpfsHash)),
      props || {}
    );
    return transactionHash;
  }
}
