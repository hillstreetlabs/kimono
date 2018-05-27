declare module "secrets.js-grempe" {
  type ShareComponents = {
    bits: number;
    id: number;
    data: string;
  };

  export default {
    share: (secret: string, numShares: number, threshold: number) => string[],
    combine: (shares: string[]) => string,
    extractShareComponents: (share: string) => ShareComponents
  };
}
