import Ethstream from "ethstream";
import { Block } from "ethjs-shared";
import Eth from "ethjs-query";
import EthContract from "ethjs-contract";
import BN from "bn.js";
import kimono from "../../contracts/build/contracts/Kimono.json";
import { IProvider } from "ethjs-shared";
import createProvider from "./util/createProvider";
import * as crypto from "./util/crypto";

// import * as crypto from "./util/crypto";

async function getContract(eth: Eth) {
  try {
    const networkVersion = await eth.net_version();
    const builder = EthContract(eth)<KimonoContract>(kimono.abi);
    const contract = builder.at(kimono.networks[networkVersion].address);
    if (!contract) throw new Error("Something went wrong");
    return contract;
  } catch (e) {
    throw new Error(
      "Something went wrong finding the contract on the network. Are you sure it's deployed?"
    );
  }
}

interface KimonoContract {
  registerRevealer: (
    publicKey: string,
    minReward: BN,
    stakePerMessage: BN,
    totalStake: BN,
    opts?: any
  ) => Promise<string>;
}

export default class Revealer {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  address: string;
  provider: IProvider;
  ethstream: Ethstream;
  eth: Eth;
  contract: KimonoContract;
  isSetup: boolean;

  constructor(secretKey: string, rpcUrl: string) {
    this.secretKey = crypto.hexToBytes(secretKey);
    this.publicKey = crypto.secretKeyToPublicKey(this.secretKey);
    this.provider = createProvider(secretKey, rpcUrl);
  }

  async setup() {
    this.ethstream = new Ethstream(this.provider, {
      onAddBlock: block => this.onAddBlock(block),
      onConfirmBlock: block => this.onConfirmBlock(block)
    });
    this.eth = new Eth(this.provider);
    const accounts = await this.eth.accounts();
    this.address = accounts[0];

    this.contract = await getContract(this.eth);
    this.isSetup = true;
  }

  async signup(stakeAmount: BN) {
    if (!this.isSetup) await this.setup();
    await this.contract.registerRevealer(
      crypto.bytesToHex(this.publicKey),
      new BN(10),
      new BN(20),
      new BN(1000),
      {
        from: this.address,
        gas: 500000
      }
    );
    // Send a registration to the contract with this private key
  }

  async start() {
    if (!this.isSetup) await this.setup();
    console.log("Starting node with address", this.address);
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
