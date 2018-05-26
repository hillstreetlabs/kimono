import Ethstream from "ethstream";
import { Block } from "ethjs-shared";
import Eth from "ethjs-query";
import EthContract from "ethjs-contract";
import BN from "bn.js";
import kimono from "../../contracts/build/contracts/Kimono.json";
import kimonoCoin from "../../contracts/build/contracts/KimonoCoin.json";
import { IProvider } from "ethjs-shared";
import createProvider from "./util/createProvider";
import * as crypto from "./util/crypto";

// import * as crypto from "./util/crypto";

const GAS_LIMIT = 500000;
const NULL_PUBLIC_KEY =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

async function getContract<T>(eth: Eth, contractObj: any) {
  try {
    const networkVersion = await eth.net_version();
    const builder = EthContract(eth)<T>(contractObj.abi);
    const contract = builder.at(contractObj.networks[networkVersion].address);
    if (!contract) throw new Error("Something went wrong");
    return contract;
  } catch (e) {
    throw new Error(
      "Something went wrong finding the contract on the network. Are you sure it's deployed?"
    );
  }
}

interface KimonoContract {
  address: string;
  revealerTable: (address: string) => { publicKey: string };
  registerRevealer: (
    publicKey: string,
    minReward: BN,
    stakePerMessage: BN,
    totalStake: BN,
    opts?: any
  ) => Promise<string>;
}

interface KimonoCoinContract {
  address: string;
  approveAll: (address: string, opts?: any) => Promise<string>;
}

export default class Revealer {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  address: string;
  provider: IProvider;
  ethstream: Ethstream;
  eth: Eth;
  contract: KimonoContract;
  coinContract: KimonoCoinContract;
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

    this.contract = await getContract<KimonoContract>(this.eth, kimono);
    this.coinContract = await getContract<KimonoCoinContract>(
      this.eth,
      kimonoCoin
    );
    this.isSetup = true;
  }

  async register(stakeAmount: BN) {
    if (!this.isSetup) await this.setup();

    const revealer = await this.contract.revealerTable(this.address);
    if (revealer.publicKey !== NULL_PUBLIC_KEY)
      console.warn(`WARNING: Revealer ${this.address} has already registered`);

    console.log("Approving KimonoCoin transfers");
    await this.coinContract.approveAll(this.contract.address, {
      from: this.address,
      gas: GAS_LIMIT
    });

    console.log("Registering Kimono Revealer with address ", this.address);
    await this.contract.registerRevealer(
      crypto.bytesToHex(this.publicKey),
      new BN(10),
      new BN(20),
      new BN(1000),
      {
        from: this.address,
        gas: GAS_LIMIT
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
