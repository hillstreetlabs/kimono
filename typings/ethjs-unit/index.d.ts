declare module "ethjs-unit" {
  import BN = require("bn.js");
  export default class Unit {
    static fromWei: (amount: number | BN, unit: string) => BN;
    static toWei: (amount: number | BN, unit: string) => BN;
  }
}
