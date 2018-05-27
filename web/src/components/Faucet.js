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

  componentDidMount() {
  }

  async requestCoins() {
    console.log('requested coins');
    console.log('', this.props.store.currentUser.address);
  }

  render() {
    return (
      <Container>
        <Wrapper color={colors.green}>
          <h1>Faucet</h1>
          <Spacer />
          <AnimatedButton
            onClick={() => this.requestCoins()}
          >
            Get 20 tokens
          </AnimatedButton>
        </Wrapper>
      </Container>
    );
  }

}
