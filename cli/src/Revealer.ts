import Ethstream from "ethstream";
import HttpProvider from "ethjs-provider-http";
import { Block } from "ethjs-shared";
import Eth from "ethjs-query";
import EthContract from "ethjs-contract";
import BN from "bn.js";
import kimono from "../../contracts/build/contracts/Kimono.json";

import * as crypto from "./util/crypto";

interface KimonoContract {
  advertise: (stakeAmount: BN, opts?: any) => Promise<string>;
}

export default class Revealer {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  ethstream: Ethstream;
  eth: Eth;
  contract: KimonoContract;

  constructor(privateKey: string, provider: HttpProvider) {
    this.privateKey = crypto.hexToBytes(privateKey);
    this.publicKey = crypto.secretKeyToPublicKey(this.privateKey);
    this.ethstream = new Ethstream(provider, {
      onAddBlock: block => this.onAddBlock(block),
      onConfirmBlock: block => this.onConfirmBlock(block)
    });
    this.eth = new Eth(provider);
    this.contract = EthContract(this.eth)<KimonoContract>(kimono.abi).at(
      process.env.CONTRACT_ADDRESS
    );
  }

  async signup(stakeAmount: BN) {
    await this.contract.advertise(stakeAmount);
    // Send a registration to the contract with this private key
  }

  start() {
    console.log(
      "Starting node with public key",
      crypto.bytesToHex(this.publicKey)
    );
    this.ethstream.start();
  }

  async exit() {
    console.log("Exiting...");
    await this.ethstream.stop();
  }

  getAllMessages() {
    // Return
  }

  onAddBlock(block: Block) {
    console.log("Added block", block.hash);
  }

  onConfirmBlock(block: Block) {
    console.log("Confirmed block", block.hash);
  }
}
