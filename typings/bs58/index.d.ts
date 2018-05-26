declare module "bs58" {
  export default {
    encode: (bytes: Uint8Array | Buffer) => string,
    decode: (str: string) => number[]
  };
}
