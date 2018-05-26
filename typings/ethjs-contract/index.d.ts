declare module "ethjs-contract" {
  import Eth = require("ethjs-query");

  export interface Contract<T> {
    at: (address: str) => T;
  }

  declare function EthContract(eth: Eth): ContractBuilder;
  type ContractBuilder = <T>(abi: any) => Contract<T>;

  export default EthContract;
}
