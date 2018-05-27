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

@inject("store")
@observer
export default class AddMessage extends Component {

  componentDidMount() {
  }

  render() {
    return (
      <Container>
        <Wrapper color={colors.green}>
          <h1>Faucet</h1>
        </Wrapper>
      </Container>
    );
  }

}
