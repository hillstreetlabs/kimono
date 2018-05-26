import SignerProvider from "ethjs-provider-signer";
import { Transaction } from "ethjs-shared";
import { privateToAccount } from "ethjs-account";
import { sign } from "ethjs-signer";

export default function createProvider(privateKey: string, rpcUrl: string) {
  return new SignerProvider(rpcUrl, {
    signTransaction: (rawTx: Transaction, cb: (_: any, res: string) => void) =>
      cb(null, sign(rawTx, privateKey)),
    accounts: (cb: (_: any, keys: string[]) => void) =>
      cb(null, [privateToAccount(privateKey).address])
  });
}
