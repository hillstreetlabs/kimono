import { action, observable, computed } from "mobx";
import abi from "ethjs-abi";

const REFRESH_NETWORK_VERSION_DELAY = 1000;

export default class Contracts {
  @observable networkVersion;
  @observable loadingContracts = true;

  constructor(store) {
    this.store = store;
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
    // const address = (Marketplace.networks[this.networkVersion] || {}).address;
    // if (!address) return null;
    // const contract = this.store.eth.contract(Marketplace.abi).at(address);
    // contract.decodeLogs = abi.logDecoder(contract.abi);
    // return contract;
  }
}
