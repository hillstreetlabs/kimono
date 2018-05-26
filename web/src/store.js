import { action, observable, computed, autorun } from "mobx";
import Eth from "ethjs-query";
import IPFS from "./ipfs";
import Contracts from "./contracts";
import * as crypto from "./crypto";

const GET_CURRENT_USER_DELAY = 1000;

export default class Store {
  @observable currentUser;
  @observable loadingCurrentUser = true;

  ipfs = new IPFS();

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
    this.contracts = new Contracts(this);
    this.getCurrentUser();
  }

  @action
  async getCurrentUser() {
    const accounts = await this.eth.accounts();

    if (!this.currentUser || accounts[0] != this.currentUser.address) {
      this.loadingCurrentUser = !!accounts[0]; // Set to false if nothing to load
      this.currentUser = { address: accounts[0] };
    }

    if (this.contracts.ready && this.currentUser && this.currentUser.address) {
      // TODO: some user setup from contract
      this.loadingCurrentUser = false;
    }

    this.getCurrentUserTimeout = setTimeout(
      () => this.getCurrentUser(),
      GET_CURRENT_USER_DELAY
    );
  }
}
