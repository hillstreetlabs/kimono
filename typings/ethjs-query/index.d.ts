declare module "ethjs-query" {
  import EthjsRpc = require("ethjs-rpc");
  import BN = require("bn.js");
  import {
    Block,
    Transaction,
    TransactionReceipt,
    Log,
    IProvider
  } from "ethjs-shared";

  class EthjsQuery {
    constructor(provider: IProvider);
    rpc: EthjsRpc;
    accounts(): Promise<Array<string>>;
    call(transaction: Transaction): Promise<any>;
    estimateGas(transaction: Transaction): Promise<BN>;
    getBalance(address: string): Promise<BN>;
    getBlockByNumber(
      blockNumber: number | "earliest" | "latest" | "pending",
      returnFullBlock: boolean
    ): Promise<Block>;
    getBlockByHash(blockHash: string, returnFullBlock: boolean): Promise<Block>;
    getLogs(options: {
      fromBlock: BN | string;
      toBlock: BN | string;
      address: string;
      topics: (string | null)[];
    }): Promise<Array<Log>>;
    getTransactionCount(address: string): Promise<BN>;
    getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt>;
    net_version(): Promise<string>;
    sendTransaction(transaction: Transaction): Promise<string>;
    sendRawTransaction(signedTransaction: string): Promise<string>;
    blockNumber(): Promise<BN>;
  }

  namespace EthjsQuery {
    const keccak256: (source: string) => string;
  }

  export = EthjsQuery;
}
