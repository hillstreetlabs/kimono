declare module "ethjs-rpc" {
  import EthjsHttpProvider = require("ethjs-provider-http");
  import EthjsRpc = require("ethjs-rpc");
  import BN = require("bn.js");
  import { Block, Transaction, TransactionReceipt, Log } from "ethjs-shared";

  class EthRPC {
    constructor(provider: EthjsHttpProvider);
    sendAsync(opts: Object, callback: Function);
  }

  export = EthRPC;
}
