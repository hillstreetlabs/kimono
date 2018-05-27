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
  // BEGIN -> PENDING -> COMPLETE
  @observable faucetState = 'BEGIN';

  componentDidMount() {
  }

  async requestCoins() {
    console.log('requested coins');
    const response = await this.props.store.kimono.faucet({ from: this.props.store.currentUser.address});
    console.log('faucet', response);

    this.showSuccessMessage();
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
              this.props.store.currentUser.balance.div(BASE_UNIT).toString()
            } KimonoCoins
          </div>
          <Spacer />
          <AnimatedButton
            onClick={() => this.requestCoins()}
          >
            Get 20 tokens
          </AnimatedButton>
          <Spacer />
          { this.displaySuccessMessage &&
            <div>Success!</div>
          }
        </Wrapper>
      </Container>
    );
  }

}
