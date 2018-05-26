declare module "ethjs-provider-signer" {
  import { IProvider } from "ethjs-shared";

  class SignerProvider implements IProvider {
    constructor(address: string, options?: any);

    accounts: string[];
  }

  export = SignerProvider;
}
