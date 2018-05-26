declare module "ethjs-provider-http" {
  import { IProvider } from "ethjs-shared";

  class HttpProvider implements IProvider {
    constructor(address: string, options?: any);

    accounts: string[];
    sendAsync(opts: Object, callback: Function): Promise<string>;
  }

  export = HttpProvider;
}
