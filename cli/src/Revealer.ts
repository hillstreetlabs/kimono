import Ethstream from "ethstream";
import HttpProvider from "ethjs-provider-http";
import { Block } from "ethjs-shared";
import Eth from "ethjs-query";
import EthContract from "ethjs-contract";
import BN from "bn.js";
import kimono from "../../contracts/build/contracts/Kimono.json";
import { IProvider } from "ethjs-shared";

// import * as crypto from "./util/crypto";

interface KimonoContract {
  advertise: (stakeAmount: BN, opts?: any) => Promise<string>;
}

export default class Revealer {
  provider: IProvider;
  ethstream: Ethstream;
  eth: Eth;
  contract: KimonoContract;

  constructor(provider: HttpProvider) {
    this.ethstream = new Ethstream(provider, {
      onAddBlock: block => this.onAddBlock(block),
      onConfirmBlock: block => this.onConfirmBlock(block)
    });
    this.provider = provider;
    this.eth = new Eth(provider);
    this.contract = EthContract(this.eth)<KimonoContract>(kimono.abi).at(
      process.env.CONTRACT_ADDRESS
    );
  }

  async signup(stakeAmount: BN) {
    await this.contract.advertise(stakeAmount);
    // Send a registration to the contract with this private key
  }

  async start() {
    const accounts = await this.eth.accounts();
    console.log("Starting node with address", accounts[0]);
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
