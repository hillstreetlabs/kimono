declare module "ethstream" {
  import { Block, IProvider } from "ethjs-shared";

  type EthstreamProps = {
    onAddBlock?: (block: Block) => void;
    onConfirmBlock?: (block: Block) => void;
    onRollbackBlock?: (block: Block) => void;
    fromBlockNumber?: number;
    fromBlockHash?: string;
    numConfirmations?: number;
  };

  export default class Ethstream {
    constructor(provider: IProvider, props: EthstreamProps);

    start();
    stop();
  }
}
