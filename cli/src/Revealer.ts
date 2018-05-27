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
  getFragmentByMessageAndRevealer: (
    nonce: BN,
    address: string
  ) => Promise<{ fragment: string[] }>;
  revealFragment: (
    nonce: BN,
    fragment: string[],
    opts?: any
  ) => Promise<string>;
  messageToRevealerToHashOfFragments: (
    nonce: BN,
    address: string
  ) => Promise<[BN]>;
  test_getFragmentHash: (p1: string, p2: string) => Promise<[string]>;
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
    this.address = accounts[0].toLowerCase();

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

    // Check whether we have revealed a fragment for this message already
    const { fragment } = await this.contract.getFragmentByMessageAndRevealer(
      crypto.bytesToBn(message.nonce),
      this.address
    );
    const revealedFragment = crypto.bytesToShare(
      crypto.hexArrayToBytes(fragment)
    );
    if (
      revealedFragment !==
      "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    ) {
      // We've revealed this fragment, don't add this message
      return;
    }

    // Grab IPFS data
    try {
      const content: {
        secretFragments: { [address: string]: string };
        publicKey: string;
      } = await ipfs.getJson(message.encryptedFragmentsIpfsHash);
      const senderPublicKey = crypto.hexToBytes(content.publicKey);
      const encryptedFragment = crypto.hexToBytes(
        content.secretFragments[this.address]
      );
      this.fragmentsByNonce[message.nonceHex] = crypto.decryptSecretForRevealer(
        encryptedFragment,
        message.nonce,
        senderPublicKey,
        this.secretKey
      );

      // Double check fragment hash is right
      const [
        contractHash
      ] = await this.contract.messageToRevealerToHashOfFragments(
        crypto.bytesToBn(message.nonce),
        this.address
      );
      const [contractRealHash] = await this.contract.test_getFragmentHash(
        crypto.bytesToHex(
          this.fragmentsByNonce[message.nonceHex].subarray(0, 32)
        ),
        crypto.bytesToHex(
          this.fragmentsByNonce[message.nonceHex].subarray(32, 50)
        )
      );
      console.log(
        "Checking fragment hash for fragment",
        crypto.bytesToHex(this.fragmentsByNonce[message.nonceHex])
      );

      console.log(
        crypto.bytesToHex(crypto.sha3(this.fragmentsByNonce[message.nonceHex])),
        "Hash of decrypted fragment"
      );
      console.log(
        crypto.bytesToHex(crypto.bnToBytes(contractHash, 32)),
        "Hash stored on contract"
      );
      console.log(
        crypto.bytesToHex(crypto.hexToBytes(contractRealHash)),
        "Hash generated by the contract"
      );
    } catch (e) {
      console.warn(e);
      this.debug(
        "Warning: got invalid IPFS content for message",
        message.nonceHex,
        message.encryptedFragmentsIpfsHash
      );
    }

    // Add the message to our message list
    this.messages.push(message);

    // Find which block to reveal message at
    // Store that block and wait for it
  }

  async onAddBlock(rawBlock: Block) {
    this.debug("Adding block ", rawBlock.number);
    // Check if there are new messages
    const block: Block = await this.eth.getBlockByHash(rawBlock.hash, true);
    const events = await eventsFromBlock(this.eth, this.contract, block);
    await Promise.all(
      events
        .filter(event => event._eventName === "MessageCreation")
        .map(async (event: MessageCreationEvent) => {
          const message = await this.contract.getMessage(event.nonce);
          this.addMessage(Message.fromContract(message));
        })
    );

    // Check if we should reveal any messages
    const messagesToRemove: Message[] = [];

    await Promise.all(
      this.messages.map(async message => {
        console.log(
          "Checking if message should be revealed",
          message.revealBlock,
          rawBlock.number
        );
        if (rawBlock.number >= message.revealBlock + message.revealPeriod) {
          // Forget this message, we missed it
          messagesToRemove.push(message);
          return;
        }
        if (
          rawBlock.number >= message.revealBlock &&
          rawBlock.number <= message.revealBlock + message.revealPeriod
        ) {
          console.log("We should reveal", message);
          await this.contract.revealFragment(
            crypto.bytesToBn(message.nonce),
            crypto.bytesToHexArray(this.fragmentsByNonce[message.nonceHex]),
            {
              from: this.address,
              gas: GAS_LIMIT
            }
          );
        }
      })
    );

    // Remove old messages
    messagesToRemove.forEach(message => {
      this.messages.splice(this.messages.indexOf(message), 1);
    });
  }

  onConfirmBlock(block: Block) {
    this.debug("Confirmed block", block.hash);
  }

  debug(...args: any[]) {
    console.log(`[${this.address.substring(0, 9)}]`, ...args);
  }
}
