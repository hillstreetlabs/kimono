import { action, observable, computed, autorun } from "mobx";
import Eth from "ethjs";
import Kimono from "./Kimono";
import * as crypto from "./crypto";
import { Kimono as KimonoBuild } from "../../contracts";

const GET_CURRENT_USER_DELAY = 1000;
const REFRESH_NETWORK_VERSION_DELAY = 1000;

export default class Store {
  @observable currentUser;
  @observable networkVersion;
  @observable loadingContracts = true;
  @observable loadingCurrentUser = true;

  constructor() {
    const ethOptions = { interval: 3000 };
    if (
      typeof window.web3 !== "undefined" &&
      typeof window.web3.currentProvider !== "undefined"
    ) {
      this.eth = new Eth(window.web3.currentProvider, ethOptions);
    } else {
      this.eth = new Eth(
        new Eth.HttpProvider("http://localhost:8545"),
        ethOptions
      );
    }
    window.eth = this.eth;
    this.getNetworkVersion();
    this.getCurrentUser();
  }

  @action
  async getNetworkVersion() {
    this.networkVersion = await this.eth.net_version();
    this.loadingContracts = false;
    this.getNetworkVersionTimeout = setTimeout(
      () => this.getNetworkVersion(),
      REFRESH_NETWORK_VERSION_DELAY
    );
  }

  @computed
  get kimonoReady() {
    return !!this.kimono;
  }

  @computed
  get kimono() {
    if (!this.networkVersion) return null;
    const address = (KimonoBuild.networks[this.networkVersion] || {}).address;
    if (!address) return null;
    return new Kimono(this.eth, address);
  }

  @action
  async getCurrentUser() {
    const accounts = await this.eth.accounts();

    if (!this.currentUser || accounts[0] != this.currentUser.address) {
      this.loadingCurrentUser = !!accounts[0]; // Set to false if nothing to load
      this.currentUser = { address: accounts[0] };
    }

    if (this.kimonoReady && this.currentUser && this.currentUser.address) {
      // TODO: some user setup from contract
      this.loadingCurrentUser = false;
    }

    this.getCurrentUserTimeout = setTimeout(
      () => this.getCurrentUser(),
      GET_CURRENT_USER_DELAY
    );
  }

  async generateSecretKey() {
    const message =
      "KIMONO LOGIN: Sign this message to authenticate with Kimono.";
    const result = await this.eth.personal_sign(
      Eth.fromUtf8(message, "hex"),
      this.currentUser.address
    );
    const secretKey = crypto.sha256(crypto.hexToBytes(result));
    return crypto.bytesToHex(secretKey);
  }
}
