import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import { action, observable } from "mobx";
import secrets from "secrets.js-grempe";

import BN from "bn.js";

@inject("store")
@observer
export default class Demo extends Component {
  @observable secretKey = null;
  @observable content = { message: "Hey there, this is a demo" };

  async signMessage() {
    this.secretKey = await this.props.store.generateSecretKey();
    console.log(this.secretKey);
  }

  async createMessage() {
    await this.props.store.kimono.createMessage(
      this.secretKey,
      this.content,
      1000,
      new BN(100000),
      2,
      3,
      { from: this.props.store.currentUser.address }
    );
  }

  @action
  handleContentChange(e) {
    this.content = JSON.parse(e.target.value);
  }

  render() {
    window.secrets = secrets;
    return (
      <div>
        <h1>Kimono demo</h1>
        <p>
          Kimono contract found at <b>{this.props.store.kimono.address}</b>
        </p>
        <p>
          Secret key:{" "}
          {this.secretKey || (
            <button onClick={() => this.signMessage()}>Sign</button>
          )}
        </p>
        <textarea
          onChange={e => this.handleContentChange(e)}
          value={JSON.stringify(this.content)}
        />
        <p>
          <button
            disabled={!this.secretKey}
            onClick={() => this.createMessage()}
          >
            Create message
          </button>
        </p>
      </div>
    );
  }
}
