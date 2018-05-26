declare module "ethstream" {
  import EthjsHttpProvider = require("ethjs-provider-http");
  import { Block } from "ethjs-shared";

  type EthstreamProps = {
    onAddBlock?: (block: Block) => void;
    onConfirmBlock?: (block: Block) => void;
    onRollbackBlock?: (block: Block) => void;
    fromBlockNumber?: number;
    fromBlockHash?: string;
    numConfirmations?: number;
  };

  export default class Ethstream {
    constructor(provider: EthjsHttpProvider, props: EthstreamProps);

    start();
    stop();
  }
}
