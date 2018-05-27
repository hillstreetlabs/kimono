import Eth from "ethjs-query";
import HttpProvider from "ethjs-provider-http";
import EthContract from "ethjs-contract";
import EthAbi from "ethjs-abi";
import BN from "bn.js";
import * as ipfs from "./ipfs";
import * as crypto from "./crypto";
import KimonoBuild from "../Kimono.json";
import KimonoCoinBuild from "../KimonoCoin.json";

interface KimonoContract {
  createMessage: (
    nonce: string,
    minFragments: number,
    totalFragments: number,
    revealBlock: number,
    revealPeriod: number,
    hashOfRevealSecret: string,
    timeLockReward: BN,
    revealerAddresses: string[],
    revealerHashOfFragments: string[],
    encryptedMessageIPFSHash: string,
    encryptedFragmentsIPFSHash: string,
    opts?: any
  ) => Promise<string>;
  getMessage: (nonce: string) => Promise<any>;
  getEligibleRevealersCount: () => Promise<any>;
  eligibleRevealers(index: number): Promise<any>;
  revealerTable(address: string): Promise<any>;
  decodeLogs(logs: any): any;
  address: string;
}

interface KimonoCoinContract {
  address: string;
  decodeLogs(logs: any): any;
  balanceOf(address: string): Promise<{ 0: BN }>;
  faucet(opts?: any): Promise<boolean>;
}

interface Message {
  nonce: string;
  creator: string;
  secretConstructor: string;
  minFragments: number;
  totalFragments: number;
  revealBlock: number;
  revealPeriod: number;
  hashOfRevealSecret: string;
  timeLockReward: BN;
  encryptedFragments: SecretFragmentsIpfsData;
  messageContent?: string;
}

interface Revealer {
  address: string;
  publicKey: string;
  minReward: BN;
  stakePerMessage: BN;
}

interface SecretFragmentsIpfsData {
  publicKey: string;
  secretFragments: { [address: string]: string };
}

export default class Kimono {
  eth: Eth;
  kimono: KimonoContract;
  kimonoCoin: KimonoCoinContract;

  constructor(provider: HttpProvider, networkVersion: string) {
    // Check web3 provider
    if (!provider)
      throw new Error(
        "web3 provider must be specified (e.g. `new Kimono(new HttpProvider('http://localhost:8545'))`)"
      );
    this.eth = new Eth(provider);
    // Init Kimono contract instance
    const kimonoAddress = (KimonoBuild.networks[networkVersion] || {}).address;
    if (!kimonoAddress)
      throw new Error(
        "Kimono smart contract not found. Try another Ethereum network."
      );
    this.kimono = EthContract(this.eth)<KimonoContract>(KimonoBuild.abi).at(
      kimonoAddress
    );
    this.kimono.decodeLogs = logs => EthAbi.logDecoder(KimonoBuild.abi)(logs);
    // Init KimonoCoin contract instance
    const kimonoCoinAddress = (KimonoCoinBuild.networks[networkVersion] || {})
      .address;
    if (!kimonoCoinAddress)
      throw new Error(
        "KimonoCoin smart contract not found. Try another Ethereum network."
      );
    this.kimonoCoin = EthContract(this.eth)<KimonoCoinContract>(
      KimonoCoinBuild.abi
    ).at(kimonoCoinAddress);
    this.kimonoCoin.decodeLogs = logs =>
      EthAbi.logDecoder(KimonoCoinBuild.abi)(logs);
  }

  async getCoinBalance(address: string): Promise<BN> {
    const response = await this.kimonoCoin.balanceOf(address);
    return response[0];
  }

  async faucet(opts?: Object): Promise<boolean> {
    const response = await this.kimonoCoin.faucet(opts || {});
    return response;
  }

  // Return all eligible revealers from contract
  async getEligibleRevealers() {
    const eligibleRevealersCount: BN = (await this.kimono.getEligibleRevealersCount())[0];
    const eligibleRevealers: Revealer[] = new Array(
      eligibleRevealersCount.toNumber()
    ).fill(undefined);
    for (let i = 0; i < eligibleRevealersCount.toNumber(); i++) {
      const revealerAddress = (await this.kimono.eligibleRevealers(i))[0];
      const [
        publicKey,
        minReward,
        stakePerMessage
      ] = await this.kimono.revealerTable(revealerAddress);
      eligibleRevealers[i] = {
        address: revealerAddress,
        publicKey,
        minReward,
        stakePerMessage
      };
    }
    return eligibleRevealers;
  }

  // Select revealers from all eligible revealers for a message
  async getRevealersForMessage(reward: BN, numRevealers: number) {
    const eligibleRevealers: Revealer[] = await this.getEligibleRevealers();
    const minReward: BN = reward.div(new BN(numRevealers + 1));
    const filteredAndOrderedRevealers: Revealer[] = eligibleRevealers
      .filter((revealer: Revealer) => minReward.gte(revealer.minReward))
      .sort((a, b) => a.stakePerMessage.sub(b.stakePerMessage).toNumber());
    return filteredAndOrderedRevealers.slice(0, numRevealers);
  }

  async getMessage(messageId: string): Promise<Message> {
    const response = await this.kimono.getMessage(messageId);
    const {
      nonce,
      creator,
      secretConstructor,
      minFragments,
      totalFragments,
      revealBlock,
      revealPeriod,
      revealSecret,
      hashOfRevealSecret,
      timeLockReward,
      encryptedFragments
    } = response;
    let messageContent;
    if (revealSecret != "0") {
      // TODO: re-generate content
      const encryptedMessage = await ipfs.get(
        ipfs.toIpfsHash(response.encryptedMessage)
      );
      messageContent = crypto.decryptMessage(
        new Uint8Array(encryptedMessage),
        crypto.bnToBytes(nonce, 24),
        crypto.bnToBytes(revealSecret, 32)
      );
    }
    return {
      nonce,
      creator,
      secretConstructor:
        secretConstructor != "0x0000000000000000000000000000000000000000"
          ? secretConstructor
          : null,
      minFragments: minFragments.toNumber(),
      totalFragments: totalFragments.toNumber(),
      revealBlock: revealBlock.toNumber(),
      revealPeriod: revealPeriod.toNumber(),
      hashOfRevealSecret,
      timeLockReward,
      messageContent,
      encryptedFragments: encryptedFragments
    };
  }

  async createMessage(
    props: {
      secret: string;
      messageContent: string | Uint8Array;
      revealAtBlock: number;
      revealPeriod: number;
      reward: BN;
      minFragments: number;
      totalFragments: number;
    },
    opts?: Object
  ) {
    const {
      secret,
      messageContent,
      revealAtBlock,
      revealPeriod,
      reward,
      minFragments,
      totalFragments
    } = props;
    // Find and select revealers
    const eligibleRevealers: Revealer[] = await this.getRevealersForMessage(
      reward,
      totalFragments
    );
    if (eligibleRevealers.length < totalFragments)
      throw new Error(
        `There are not ${totalFragments} available to reveal this message`
      );
    const revealerAddresses: string[] = eligibleRevealers.map(
      revealer => revealer.address
    );
    // Generate nonce and secret
    const nonce: Uint8Array = crypto.createNonce();
    const secretKey: Uint8Array = crypto.buildMessageSecret(
      nonce,
      crypto.hexToBytes(secret)
    );
    // TODO: add publicKey to message via createMessage
    const { publicKey } = crypto.buildKeyPairFromSecret(secretKey);
    // Split secret into totalFragments fragments
    const secretFragments: Uint8Array[] = crypto.createSecretFragments(
      secretKey,
      totalFragments,
      minFragments
    );
    // Encrypt secretFragments with public keys of revealers
    const encryptedSecretFragments: Uint8Array[] = secretFragments.map(
      (fragment: Uint8Array, i: number) => {
        const revealer: Revealer = eligibleRevealers[i];
        return crypto.encryptSecretForRevealer(
          fragment,
          nonce,
          crypto.hexToBytes(revealer.publicKey),
          secretKey
        );
      }
    );
    // Add encryptedSecretFragments to IPFS
    const encryptedSecretFragmentsByRevealer: SecretFragmentsIpfsData = {
      publicKey: crypto.bytesToHex(publicKey),
      secretFragments: {}
    };
    encryptedSecretFragments.forEach(
      (encryptedFragment: Uint8Array, i: number) => {
        const revealer: Revealer = eligibleRevealers[i];
        encryptedSecretFragmentsByRevealer.secretFragments[
          revealer.address
        ] = crypto.bytesToHex(encryptedFragment);
      }
    );
    const encryptedSecretFragmentsIpfsHash: string = await ipfs.addJson(
      encryptedSecretFragmentsByRevealer
    );
    // Hash secretFragments
    const hashedEncryptedSecretFragments: string[] = secretFragments.map(
      fragment => crypto.bytesToHex(crypto.keccak256(fragment))
    );
    // Encrypt messageContent and add to IPFS
    const encryptedContent: Uint8Array = crypto.encryptMessage(
      messageContent,
      nonce,
      secretKey
    );
    const encryptedContentIpfsHash = await ipfs.add(encryptedContent);
    // Send createMessage transaction

    const transactionHash = await this.kimono.createMessage(
      crypto.bytesToHex(nonce),
      minFragments,
      totalFragments,
      revealAtBlock,
      revealPeriod,
      crypto.bytesToHex(crypto.keccak256(secretKey)),
      reward,
      revealerAddresses,
      hashedEncryptedSecretFragments,
      crypto.bytesToHex(crypto.base58ToBytes(encryptedContentIpfsHash)),
      crypto.bytesToHex(crypto.base58ToBytes(encryptedSecretFragmentsIpfsHash)),
      opts || {}
    );
    const getReceipt = async () => {
      const receipt = await this.eth.getTransactionReceipt(transactionHash);
      const events = this.kimono.decodeLogs(receipt.logs);
      return { ...receipt, events };
    };
    return {
      transactionHash,
      getReceipt
    };
  }
}
