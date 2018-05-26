import Ethstream from "ethstream";
import EthjsHttpProvider = require("ethjs-provider-http");
import { Block } from "ethjs-shared";

export default class Revealer {
  privateKey: string;
  ethstream: Ethstream;

  constructor(privateKey: string) {
    this.privateKey = privateKey;
    const provider = new EthjsHttpProvider("https://mainnet.infura.io");
    this.ethstream = new Ethstream(provider, {
      onAddBlock: block => this.onAddBlock(block),
      onConfirmBlock: block => this.onConfirmBlock(block)
    });
  }

  start() {
    console.log("Revealer started", this.privateKey);
    this.ethstream.start();
  }

  exit() {
    console.log("Exiting...");
  }

  onAddBlock(block: Block) {
    console.log("Added block", block);
  }

  onConfirmBlock(block: Block) {
    console.log("Confirmed block", block);
  }
}
