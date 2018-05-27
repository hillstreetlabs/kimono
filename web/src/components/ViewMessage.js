import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import { action, observable } from "mobx";
import Spacer from "./Spacer";
import BN from "bn.js";
import { Container, Wrapper, HeaderLink } from "./Root";
import styled from "react-emotion";
import { basePadding, colors } from "../styles";

@inject("store")
@observer
export default class ViewMessage extends Component {
  get messageId() {
    return this.props.match.params.messageId;
  }
  render() {
    return (
      <Container>
        <Wrapper color={colors.blue}>
          <h1>
            <HeaderLink to="/">Kimono Time Capsule</HeaderLink> >{" "}
            <span style={{ fontWeight: 300 }}>{this.messageId}</span>
          </h1>
          View message
        </Wrapper>
      </Container>
    );
  }
}
