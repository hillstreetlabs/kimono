import React, { Component } from "react";
import { Provider, observer, inject } from "mobx-react";
import { BrowserRouter, Switch, Route, Redirect } from "react-router-dom";
import { Link } from "react-router-dom";

import Landing from "./Landing";
import FAQ from "./FAQ";
import AddMessage from "./AddMessage";
import ViewMessage from "./ViewMessage";
import Faucet from "./Faucet";


import styled from "react-emotion";
import { basePadding, colors } from "../styles";

export const Container = styled("div")`
  padding: ${basePadding * 1.5}px;
`;

export const Wrapper = styled("div")`
  border: 3px solid ${props => props.color || colors.textBlack};
  padding: ${basePadding * 1.5}px;
  position: relative;
`;

export const HeaderLink = styled(Link)`
  color: black;

  &:hover {
    color: ${colors.green};
    border-bottom: 3px dotted ${colors.blue};
    text-decoration: none;
  }
`;

@inject("store")
@observer
export class App extends Component {
  render() {
    // Return null for initial loading
    if (this.props.store.loadingContracts) return null;
    // Return locked screen if contract not deployed on network
    if (!this.props.store.kimonoReady)
      return <div>Kimono contracts not found. Try another network.</div>;
    // Return null for initial user loading
    if (this.props.store.loadingCurrentUser) return null;
    // Return locked screen if currentUser is missing an address
    if (!this.props.store.currentUser.address)
      return <div>No user found. Try unlocking Metamask.</div>;
    return (
      <div>
        <Switch>
          <Route path="/add" component={AddMessage} />
          <Route path="/faucet" component={Faucet} />
          <Route path="/:messageId" component={ViewMessage} />
          <Redirect to="/" />
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
