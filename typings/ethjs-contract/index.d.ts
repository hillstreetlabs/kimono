declare module "ethjs-contract" {
  import EthQuery = require("ethjs-query");

  class EthContract {
    constructor(query: EthQuery);
  }

  export = EthContract;
}
