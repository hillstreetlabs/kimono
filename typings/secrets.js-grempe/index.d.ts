declare module "secrets.js-grempe" {
  export default {
    share: (secret: string, numShares: number, threshold: number) => string[],
    combine: (shares: string[]) => string
  };
}
