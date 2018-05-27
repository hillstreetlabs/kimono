import Eth from "ethjs-query";
import HttpProvider from "ethjs-provider-http";
import EthContract from "ethjs-contract";
import IPFS from "./ipfs";
import KimonoBuild from "../../contracts/build/contracts/Kimono.json";
import * as crypto from "./crypto";
import BN from "bn.js";

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
  getEligibleRevealersCount: () => Promise<any>;
  eligibleRevealers(index: number): Promise<any>;
  revealerTable(address: string): Promise<any>;
  address: string;
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
  ipfs: IPFS;

  constructor(provider: HttpProvider, kimonoAddress?: string) {
    // Check web3 provider
    if (!provider)
      throw new Error(
        "web3 provider must be specified (e.g. `new Kimono(new HttpProvider('http://localhost:8545'))`)"
      );
    this.eth = new Eth(provider);
    this.ipfs = new IPFS();
    this.kimono = EthContract(this.eth)<KimonoContract>(KimonoBuild.abi).at(
      kimonoAddress
    );
  }

  get address() {
    return this.kimono.address;
  }

  // Return all eligible revealers from contract
  async getEligibleRevealers() {
    const eligibleRevealersCount: BN = (await this.kimono.getEligibleRevealersCount())[0];
    console.log(eligibleRevealersCount.toString());
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
      .filter((revealer: Revealer) => revealer.minReward.gte(minReward))
      .sort((a, b) => a.stakePerMessage.sub(b.stakePerMessage).toNumber());
    return filteredAndOrderedRevealers.slice(0, numRevealers);
  }

  async createMessage(
    secret: string,
    content: string,
    revealAtBlock: number,
    revealPeriod: number,
    reward: BN,
    minFragments: number,
    totalFragments: number,
    props?: Object
  ) {
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
    const encryptedSecretFragmentsIpfsHash: string = await this.ipfs.addJson(
      encryptedSecretFragments
    );
    // Hash encryptedSecretFragments
    const hashedEncryptedSecretFragments: string[] = encryptedSecretFragments.map(
      (encryptedFragment: Uint8Array) =>
        crypto.bytesToHex(crypto.sha3(encryptedFragment))
    );
    // Encrypt content and add to IPFS
    const encryptedContent: Uint8Array = crypto.encryptMessage(
      JSON.stringify(content),
      nonce,
      secretKey
    );
    const encryptedContentIpfsHash = await this.ipfs.add(encryptedContent);
    // Send createMessage transaction

    const transactionHash = await this.kimono.createMessage(
      crypto.bytesToHex(nonce),
      minFragments,
      totalFragments,
      revealAtBlock,
      revealPeriod,
      crypto.bytesToHex(crypto.sha3(secretKey)),
      reward,
      revealerAddresses,
      hashedEncryptedSecretFragments,
      crypto.bytesToHex(crypto.base58ToBytes(encryptedSecretFragmentsIpfsHash)),
      crypto.bytesToHex(crypto.base58ToBytes(encryptedContentIpfsHash)),
      props || {}
    );
    return transactionHash;
  }
}
