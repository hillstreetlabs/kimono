import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import { computed, action, observable, when } from "mobx";
import { Link } from "react-router-dom";
import Spacer from "./Spacer";
import Button from "./Button";
import Input from "./Input";
import BN from "bn.js";
import { Container, Wrapper, HeaderLink } from "./Root";
import styled, { keyframes } from "react-emotion";
import { basePadding, colors, lighten } from "../styles";

const BASE_UNIT = new BN("1000000000000000000");

const gentlePulseColor = keyframes`
  0% { background-color: ${colors.darkGreen}; }
  45% { background-color: ${lighten(colors.blue, 20)}; }
  100% {background-color: ${colors.darkGreen}; }
`;

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
  @observable unlockingCoins = false;
  @observable requestingCoins = false;

  @computed
  get kimonoCoinUnlocked() {
    if (!this.props.store.currentUser) return null;
    return this.props.store.currentUser.allowanceWei.gt(new BN(0));
  }

  async requestCoins() {
    this.requestingCoins = true;
    const startingBalance = this.props.store.currentUser.balanceWei;
    try {
      await this.props.store.kimono.faucet({
        from: this.props.store.currentUser.address
      });
      when(
        () => this.props.store.currentUser.balanceWei.gt(startingBalance),
        () => (this.requestingCoins = false)
      );
    } catch (err) {
      this.requestingCoins = false;
    }
  }

  unlockCoins() {
    this.unlockingCoins = true;
    try {
      this.props.store.kimono.approveAll(this.props.store.currentUser.address);
    } catch (err) {
      this.unlockingCoins = false;
    }
  }

  render() {
    const { balance, address, allowance } = this.props.store.currentUser;
    return (
      <Container>
        <Wrapper color={colors.green}>
          <h1>
            <HeaderLink to="/">Kimono Time Capsule</HeaderLink> >{" "}
            <span style={{ fontWeight: 300 }}>OPEN token faucet</span>
          </h1>
          <Spacer />
          <p>Get OPEN tokens for free to use on a testnet.</p>
          <Spacer />
          {this.kimonoCoinUnlocked ? (
            <div>
              <h3>
                Current balance for {this.props.store.currentUser.address}:
              </h3>
              <Spacer size={0.5} />
              <Input value={`${balance.toString()} OPEN`} disabled={true} />
              <Spacer />
              <div style={{ fontSize: "1.3em" }}>
                <AnimatedButton
                  onClick={() => this.requestCoins()}
                  disabled={this.requestingCoins}
                  loading={this.requestingCoins}
                >
                  {this.requestingCoins
                    ? "Processing request..."
                    : "Get some OPEN tokens"}
                </AnimatedButton>
              </div>
            </div>
          ) : (
            <div>
              <h3>
                You need to unlock your account for payment and staking before
                receiving OPEN tokens.
              </h3>
              <Spacer size={0.5} />
              <div style={{ fontSize: "1.3em" }}>
                <AnimatedButton
                  onClick={() => this.unlockCoins()}
                  disabled={this.unlockingCoins}
                  loading={this.unlockingCoins}
                >
                  {this.unlockingCoins
                    ? "Unlocking OPEN tokens..."
                    : "Unlock OPEN tokens"}
                </AnimatedButton>
              </div>
            </div>
          )}
        </Wrapper>
      </Container>
    );
  }
}
