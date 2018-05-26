import Ethstream from "ethstream";
import HttpProvider from "ethjs-provider-http";
import { Block } from "ethjs-shared";

import * as crypto from "./util/crypto";

export default class Revealer {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  ethstream: Ethstream;

  constructor(privateKey: string, provider: HttpProvider) {
    this.privateKey = crypto.hexToBytes(privateKey);
    this.publicKey = crypto.secretKeyToPublicKey(this.privateKey);
    this.ethstream = new Ethstream(provider, {
      onAddBlock: block => this.onAddBlock(block),
      onConfirmBlock: block => this.onConfirmBlock(block)
    });
  }

  start() {
    console.log(
      "Starting node with public key",
      crypto.bytesToHex(this.publicKey)
    );
    this.ethstream.start();
  }

  async exit() {
    await this.ethstream.stop();
    console.log("Exiting...");
  }

  onAddBlock(block: Block) {
    console.log("Added block", block.hash);
  }

  onConfirmBlock(block: Block) {
    console.log("Confirmed block", block.hash);
  }
}
