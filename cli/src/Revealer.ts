import Ethstream from "ethstream";
import { Block } from "ethjs-shared";
import Eth from "ethjs-query";
import EthContract from "ethjs-contract";
import BN from "bn.js";
import kimono from "../../contracts/build/contracts/Kimono.json";
import kimonoCoin from "../../contracts/build/contracts/KimonoCoin.json";
import { IProvider } from "ethjs-shared";
import createProvider from "./util/createProvider";
import Unit from "ethjs-unit";
import * as crypto from "./util/crypto";
import { eventsFromBlock } from "./util/events";
import Message, { IContractMessage } from "./Message";
import * as ipfs from "./util/ipfs";

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
  abi: any[];
  revealerTable: (address: string) => Promise<{ publicKey: string }>;
  registerRevealer: (
    publicKey: string,
    minReward: BN,
    stakePerMessage: BN,
    totalStake: BN,
    opts?: any
  ) => Promise<string>;
  getMessageNoncesForRevealer: (address: string) => Promise<{ nonces: BN[] }>;
  getMessage: (nonce: BN) => Promise<IContractMessage>;
}

interface KimonoCoinContract {
  address: string;
  approveAll: (address: string, opts?: any) => Promise<string>;
}

interface MessageCreationEvent {
  nonce: BN;
  creator: string;
  encryptedFragmentsIPFSHash: ipfs.IpfsMultiHash;
  revealerAddresses: string[];
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
  messages: Message[] = [];
  fragmentsByNonce: { [nonce: string]: Uint8Array } = {};

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

  async register(
    totalStake: number,
    minMessagePrice: number,
    stakePerMessage: number
  ) {
    if (!this.isSetup) await this.setup();

    const revealer = await this.contract.revealerTable(this.address);
    if (revealer.publicKey !== NULL_PUBLIC_KEY)
      console.warn(`WARNING: Revealer ${this.address} has already registered`);

    this.debug("Approving KimonoCoin transfers");
    await this.coinContract.approveAll(this.contract.address, {
      from: this.address,
      gas: GAS_LIMIT
    });

    this.debug("Registering Kimono Revealer with address ", this.address);
    await this.contract.registerRevealer(
      crypto.bytesToHex(this.publicKey),
      new BN(Unit.toWei(minMessagePrice, "ether")),
      new BN(Unit.toWei(stakePerMessage, "ether")),
      new BN(Unit.toWei(totalStake, "ether")),
      {
        from: this.address,
        gas: GAS_LIMIT
      }
    );
    // Send a registration to the contract with this private key
  }

  async start() {
    if (!this.isSetup) await this.setup();
    await this.getOldMessages();
    this.debug("Starting node with address", this.address);
    this.ethstream.start();
  }

  async exit() {
    this.debug("Exiting...");
    await this.ethstream.stop();
  }

  async getOldMessages() {
    this.debug("Getting old messages");
    const result: {
      nonces: BN[];
    } = await this.contract.getMessageNoncesForRevealer(this.address);

    const messages = await Promise.all(
      result.nonces.map(async nonce => {
        const message = await this.contract.getMessage(nonce);
        return Message.fromContract(message);
      })
    );

    await Promise.all(
      messages.map(message => {
        return this.addMessage(message);
      })
    );
    // Return
  }

  async addMessage(message: Message) {
    // Don't add the same message twice
    if (this.messages.some(msg => msg.nonceHex === message.nonceHex)) return;
    this.messages.push(message);
    try {
      // Grab IPFS data
      const content: { [address: string]: string } = await ipfs.getJson(
        message.encryptedFragmentsIpfsHash
      );
      this.fragmentsByNonce[message.nonceHex] = crypto.hexToBytes(
        content[this.address]
      ); // Still encrypted
    } catch (e) {
      this.debug(
        "Warning: got invalid IPFS content for message",
        message.nonceHex,
        new Uint8Array(await ipfs.get(message.encryptedFragmentsIpfsHash))
      );
    }

    // Find which block to reveal message at
    // Store that block and wait for it
  }

  async onAddBlock(rawBlock: Block) {
    // Check if there are new messages
    const block: Block = await this.eth.getBlockByHash(rawBlock.hash, true);
    const events = await eventsFromBlock(this.eth, this.contract, block);
    events
      .filter(event => event._eventName === "MessageCreation")
      .forEach((event: MessageCreationEvent) => {
        this.debug("Got message creation", event);
      });

    // Check if we should reveal any messages
    this.messages.forEach(message => {
      if (message.revealBlock <= rawBlock.number.toNumber()) {
        console.log("We should reveal", message);
      }
    });
  }

  onConfirmBlock(block: Block) {
    this.debug("Confirmed block", block.hash);
  }

  debug(...args: any[]) {
    console.log(`[${this.address.substring(0, 9)}]`, ...args);
  }
}
