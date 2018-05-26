import React, { Component } from "react";
import { Provider, observer, inject } from "mobx-react";
import { BrowserRouter, Switch, Route, Redirect } from "react-router-dom";
import { Link } from "react-router-dom";

import Landing from "./Landing";
import FAQ from "./FAQ";
import Demo from "./Demo";

@inject("store")
@observer
export class App extends Component {
  render() {
    // Return null for initial loading
    if (this.props.store.contracts.loadingContracts) return null;
    // Return locked screen if contract not deployed on network
    if (!this.props.store.contracts.ready)
      return <div>Kimono contracts not found. Try another network.</div>;
    // Return null for initial user loading
    if (this.props.store.loadingCurrentUser) return null;
    // Return locked screen if currentUser is missing an address
    if (!this.props.store.currentUser.address)
      return <div>No user found. Try unlocking Metamask.</div>;
    return (
      <div>
        <Switch>
          <Route path="/demo" component={Demo} />
        </Switch>
      </div>
    );
  }
}

export default class Root extends Component {
  render() {
    return (
      <Provider store={this.props.store}>
        <BrowserRouter>
          <Switch>
            <Route path="/" exact component={Landing} />
            <Route path="/faq" component={FAQ} />
            <Route component={App} />
          </Switch>
        </BrowserRouter>
      </Provider>
    );
  }
}
