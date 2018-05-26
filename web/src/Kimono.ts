import Eth from "ethjs-query";
import HttpProvider from "ethjs-provider-http";
//import EthContract from "ethjs-contract";
import * as crypto from "./crypto";
import BN from "bn.js";

export default class Kimono {
  eth: Eth;

  constructor(provider: HttpProvider) {
    // Check web3 provider
    if (!provider)
      throw new Error(
        "web3 provider must be specified (e.g. `new Kimono(new HttpProvider('http://localhost:8545'))`)"
      );
    this.eth = new Eth(provider);
    //const contract = new EthContract(this.eth);
  }

  async getEligibleRevealers() {
    // TODO: return revealers from contract that fit criteria
  }

  async createMessage(
    secretKey: string,
    content: Object,
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
    console.log(shares);
    // TODO: get eligible revealers, split secret into N pieces, upload data to IPFS, submit transaction
  }
}
