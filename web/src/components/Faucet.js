import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import { action, observable } from "mobx";
import { Link } from "react-router-dom";
import Spacer from "./Spacer";
import Button from "./Button";
import Input from "./Input";
import Textarea from "./Textarea";
import BN from "bn.js";
import { Container, Wrapper, HeaderLink } from "./Root";
import styled, { keyframes } from "react-emotion";
import { basePadding, colors, lighten } from "../styles";

const BASE_UNIT = new BN('1000000000000000000');
const AnimatedButton = styled(Button)`
  ${props =>
    props.loading &&
    `
    opacity: 1 !important;
    animation: ${gentlePulseColor} 2s infinite;
  `};
`;

@inject("store")
@observer
export default class Faucet extends Component {
  @observable displaySuccessMessage = false;
  @observable currentBalance;
  // BEGIN -> PENDING -> COMPLETE
  @observable faucetState = 'BEGIN';

  componentDidMount() {
    this.getCurrentBalance();
  }

  async requestCoins() {
    const response = await this.props.store.kimono.faucet(
      { from: this.props.store.currentUser.address}
    );

    await this.getCurrentBalance();
    this.showSuccessMessage();
  }

  async getCurrentBalance() {
    let balance = await this.props.store.kimono.getCoinBalance(this.props.store.currentUser.address);
    this.currentBalance = balance.div(BASE_UNIT).toString();
  }

  showSuccessMessage() {
    this.displaySuccessMessage = true;
  }

  render() {
    return (
      <Container>
        <Wrapper color={colors.green}>
          <h1>Faucet</h1>
          <Spacer />
          <div>
            You have {
              this.currentBalance
            } KimonoCoins
          </div>
          <Spacer />
          <AnimatedButton
            onClick={() => this.requestCoins()}
          >
            Get coins
          </AnimatedButton>
          <Spacer />
          { this.displaySuccessMessage &&
            <div>Coins requested (please wait and refresh the page)</div>
          }
        </Wrapper>
      </Container>
    );
  }

}
