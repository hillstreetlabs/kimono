import Eth from "ethjs-query";
import HttpProvider from "ethjs-provider-http";
import EthContract from "ethjs-contract";
import IPFS from "./ipfs";
import KimonoBuild from "../../contracts/build/contracts/Kimono.json";
import * as crypto from "./crypto";
import BN from "bn.js";

interface KimonoContract {
  advertise: (stakeAmount: BN, opts?: any) => Promise<string>;
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
  }

  async createMessage(
    secretKey: string,
    content: string,
    revealAtBlock: number,
    reward: BN,
    minFragments: number,
    totalFragments: number
  ) {
    console.log(
      secretKey,
      revealAtBlock,
      content,
      reward,
      minFragments,
      totalFragments
    );
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
    // TODO: get eligible revealers
    const encryptedContent = crypto.encryptMessage(content, nonce, secret);
    const ipfsHash = await this.ipfs.add(encryptedContent);
    console.log("IPFS", ipfsHash);
    const uploadedContent = await this.ipfs.get(ipfsHash);
    console.log("uploadedContent", uploadedContent);
    const reconstructedSecret = crypto.combineSecretFragments(shares);
    console.log("reconstructed", reconstructedSecret);
    const decrypted = await crypto.decryptMessage(
      new Uint8Array(uploadedContent),
      nonce,
      crypto.hexToBytes(reconstructedSecret)
    );
    console.log("Decrypted", decrypted);
  }
}
