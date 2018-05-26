declare module "secrets.js-grempe" {
  export default {
    share: (secret: string, numShares: number, threshold: number) => Array,
    combine: (shares: Array) => string
  };
}
