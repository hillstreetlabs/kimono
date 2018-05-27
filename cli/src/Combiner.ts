import Ethstream from "ethstream";
import { Block } from "ethjs-shared";
import Eth from "ethjs-query";
import EthContract from "ethjs-contract";
import BN from "bn.js";
import kimono from "../../contracts/build/contracts/Kimono.json";
import { IProvider } from "ethjs-shared";
import createProvider from "./util/createProvider";
import * as crypto from "./util/crypto";
import { eventsFromBlock } from "./util/events";
import Message, { IContractMessage } from "./Message";

const GAS_LIMIT = 500000;

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
  getMessage: (nonce: BN) => Promise<IContractMessage>;
  messageToRevealerToFragments: (nonce: BN, address: string) => Promise<BN[]>;
  submitRevealSecret: (nonce: BN, fragment: BN, opts?: any) => Promise<string>;
}

interface FragmentRevealEvent {
  nonce: BN;
  revealer: string;
  minFragments: BN;
  onTimeRevealerCount: BN;
  fragment: string;
}

interface SecretRevealEvent {
  nonce: BN;
  revealer: string;
  secret: BN;
}

export default class Combiner {
  secretKey: Uint8Array;
  address: string;
  provider: IProvider;
  ethstream: Ethstream;
  eth: Eth;
  contract: KimonoContract;
  isSetup: boolean;
  messages: Message[] = [];
  fragmentsByNonce: { [nonce: string]: string[] } = {};

  constructor(provider: IProvider) {
    this.provider = provider;
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
    this.isSetup = true;
  }

  async start() {
    if (!this.isSetup) await this.setup();
    this.debug("Starting Kimono Combiner with address", this.address);
    this.ethstream.start();
  }

  async exit() {
    this.debug("Exiting...");
    await this.ethstream.stop();
  }

  async addMessage(message: Message) {
    // Don't add the same message twice
    if (this.messages.some(msg => msg.nonceHex === message.nonceHex)) return;
    this.messages.push(message);
  }

  async addMessageFragment(message: Message, event: FragmentRevealEvent) {
    // For now: only add messages that just got the first reveal.
    // Add fragments for messages that are in the messages.
    if (event.onTimeRevealerCount.toNumber() == 1) this.addMessage(message);
    if (this.messages.some(msg => msg.nonceHex === message.nonceHex)) {
      if (this.fragmentsByNonce[message.nonceHex] === undefined) {
        this.fragmentsByNonce[message.nonceHex] = [
          crypto.bytesToShare(crypto.hexToBytes(event.fragment))
        ];
      } else {
        this.fragmentsByNonce[message.nonceHex].push(
          crypto.bytesToShare(crypto.hexToBytes(event.fragment))
        );
      }
    }
  }

  async onAddBlock(rawBlock: Block) {
    this.debug("Adding block ", rawBlock.number);
    // Check if there are new messages
    const block: Block = await this.eth.getBlockByHash(rawBlock.hash, true);
    const events = await eventsFromBlock(this.eth, this.contract, block);

    // Check if we should reveal any messages
    const messagesToRemove: Message[] = [];

    await Promise.all(
      events
        .filter(event => event._eventName === "SecretReveal")
        .map(async (event: SecretRevealEvent) => {
          const message = await this.contract.getMessage(event.nonce);
          messagesToRemove.push(Message.fromContract(message));
        })
    );

    messagesToRemove.forEach(message => {
      this.messages.splice(this.messages.indexOf(message), 1);
    });

    await Promise.all(
      events
        .filter(event => event._eventName === "FragmentReveal")
        .map(async (event: FragmentRevealEvent) => {
          const message = await this.contract.getMessage(event.nonce);
          this.addMessageFragment(Message.fromContract(message), event);
        })
    );

    await Promise.all(
      this.messages.map(async message => {
        console.log(
          "Checking if secret should be constructed",
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
          rawBlock.number <= message.revealBlock + message.revealPeriod &&
          message.minFragments <= this.fragmentsByNonce[message.nonceHex].length
        ) {
          try {
            await this.contract.submitRevealSecret(
              crypto.bytesToBn(message.nonce),
              crypto.combineSecretFragments(
                this.fragmentsByNonce[message.nonceHex]
              ),
              {
                from: this.address,
                gas: GAS_LIMIT
              }
            );

            const result = await this.contract.getMessage(
              crypto.bytesToBn(message.nonce)
            );
            this.debug(
              "Submitted secret " +
                crypto.bytesToHex(crypto.bnToBytes(result.revealSecret, 32))
            );
          } catch {
            console.log("Error state");
          }
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
