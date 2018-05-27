import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import { action, observable } from "mobx";
import Spacer from "./Spacer";
import BN from "bn.js";

@inject("store")
@observer
export default class Demo extends Component {
  @observable currentBlockNumber;
  @observable
  newMessage = {
    secret: null,
    revealAtBlock: "",
    revealPeriod: 10,
    messageContent: "Hey there, this is a demo",
    minFragments: 3,
    totalFragments: 5,
    reward: new BN(10000)
  };
  @observable transactionHash = null;

  componentDidMount() {
    this.getBlockNumber();
  }

  async getBlockNumber() {
    const currentBlock = (await this.props.store.eth.blockNumber()).toNumber();
    this.newMessage.revealAtBlock = currentBlock + 10;
    this.currentBlockNumber = currentBlock;
  }

  async generateSecretKey() {
    this.newMessage.secret = await this.props.store.generateSecretKey();
  }

  async createMessage() {
    console.log("message", this.newMessage);
    this.transactionHash = await this.props.store.kimono.createMessage(
      this.newMessage,

      { from: this.props.store.currentUser.address }
    );
  }

  handleContentChange(e) {
    this.newMessage.messageContent = e.target.value;
  }

  handleRevealAtBlockChange(e) {
    this.newMessage.revealAtBlock = parseInt(e.target.value);
  }

  handleTotalFragmentsChange(e) {
    this.newMessage.totalFragments = parseInt(e.target.value);
  }

  handleMinFragmentsChange(e) {
    this.newMessage.minFragments = parseInt(e.target.value);
  }

  render() {
    return (
      <div>
        <div>
          Kimono contract found at <b>{this.props.store.kimono.address}</b>
        </div>
        <div>Current user: {this.props.store.currentUser.address}</div>
        <div>OPEN balance: {true}</div>
        <Spacer />
        <h1>Kimono demo</h1>
        <Spacer size={0.5} />
        <div>
          Secret key:{" "}
          {this.newMessage.secret || (
            <button onClick={() => this.generateSecretKey()}>
              Generate Secret
            </button>
          )}
        </div>
        <Spacer size={0.5} />
        <div>
          Block to be revealed (current block is {this.currentBlockNumber}):{" "}
          <input
            onChange={e => this.handleRevealAtBlockChange(e)}
            value={this.newMessage.revealAtBlock}
          />
        </div>
        <Spacer size={0.5} />
        <div>
          Total secret fragments:{" "}
          <input
            onChange={e => this.handleTotalFragmentsChange(e)}
            value={this.newMessage.totalFragments}
          />
        </div>
        <Spacer size={0.5} />
        <div>
          Minimum fragments needed to reconstruct:{" "}
          <input
            onChange={e => this.handleMinFragmentsChange(e)}
            value={this.newMessage.minFragments}
          />
        </div>
        <Spacer size={0.5} />
        <div>
          <p>Message content:</p>
          <textarea
            onChange={e => this.handleContentChange(e)}
            value={this.newMessage.messageContent}
          />
        </div>
        <Spacer size={0.5} />
        <div>
          {this.transactionHash || (
            <button
              disabled={!this.newMessage.secret}
              onClick={() => this.createMessage()}
            >
              Create message
            </button>
          )}
        </div>
      </div>
    );
  }
}
