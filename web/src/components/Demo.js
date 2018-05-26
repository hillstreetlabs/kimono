import React, { Component } from "react";
import { inject, observer } from "mobx-react";

@inject("store")
@observer
export default class Demo extends Component {
  render() {
    return (
      <div>
        <h1>Kimono demo</h1>
        <p>
          Kimono contract found at{" "}
          <b>{this.props.store.contracts.kimono.address}</b>
        </p>
      </div>
    );
  }
}
