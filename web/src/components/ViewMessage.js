import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import { action, observable } from "mobx";
import Spacer from "./Spacer";
import Badge from "./Badge";
import BN from "bn.js";
import { Container, Wrapper, HeaderLink } from "./Root";
import styled from "react-emotion";
import { basePadding, colors } from "../styles";

@inject("store")
@observer
export default class ViewMessage extends Component {
  @observable message;

  componentDidMount() {
    this.getMessage();
  }

  get messageId() {
    return this.props.match.params.messageId;
  }

  async getMessage() {
    this.message = await this.props.store.kimono.getMessage(this.messageId);
  }

  messageContent() {
    if (!this.message.revealSecret) return <div>Not revealed yet!</div>;
    return <div>Revaled!</div>;
  }

  render() {
    console.log(this.message);
    return (
      <Container>
        <Wrapper color={colors.blue}>
          <h1>
            <HeaderLink to="/">Kimono Time Capsule</HeaderLink> >{" "}
            <span style={{ fontWeight: 300 }}>
              Message {this.messageId.substr(0, 18)}...
            </span>
          </h1>
          <Spacer />
          {this.message && (
            <div>
              <div>
                <h3>Author:</h3>
                <Spacer size={0.5} />
                {this.message.creator}
              </div>
              <Spacer />
              <div>
                <h3>Message ID:</h3>
                <Spacer size={0.5} />
                {this.message.nonce.toString()}
              </div>
              <Spacer />
              <div>
                <h3>Status:</h3>
                <Spacer size={0.5} />
                {this.message.revealSecret ? (
                  <Badge color={colors.darkGreen}>Revealed</Badge>
                ) : (
                  <span>
                    <Badge color={colors.red}>Not Revealed</Badge> Will be
                    revealed after{" "}
                    <strong>Block {this.message.revealBlock}</strong>
                  </span>
                )}
              </div>
              <Spacer />
              <div>
                <h3>Time-Lock Reward:</h3>
                <Spacer size={0.5} />
                {this.message.timeLockReward.toString()} OPEN tokens
              </div>
              <Spacer />
            </div>
          )}
        </Wrapper>
      </Container>
    );
  }
}
