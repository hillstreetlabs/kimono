import { action, observable, computed } from "mobx";
import { Kimono } from "../../contracts";
import EthContract from "ethjs-contract";
import EthABI from "ethjs-abi";

const REFRESH_NETWORK_VERSION_DELAY = 1000;

export default class Contracts {
  @observable networkVersion;
  @observable loadingContracts = true;

  constructor(store) {
    this.store = store;
    this.ethContract = new EthContract(this.store.eth);
    this.getNetworkVersion();
  }

  @action
  async getNetworkVersion() {
    this.networkVersion = await this.store.eth.net_version();
    this.loadingContracts = false;
    this.getNetworkVersionTimeout = setTimeout(
      () => this.getNetworkVersion(),
      REFRESH_NETWORK_VERSION_DELAY
    );
  }

  @computed
  get ready() {
    return !!this.kimono;
  }

  @computed
  get kimono() {
    if (!this.networkVersion) return null;
    const address = (Kimono.networks[this.networkVersion] || {}).address;
    if (!address) return null;
    const contract = this.ethContract(Kimono.abi).at(address);
    contract.decodeLogs = EthABI.logDecoder(contract.abi);
    return contract;
  }
}
