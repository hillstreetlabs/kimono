import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import { action, observable } from "mobx";
import Eth from "ethjs";
import Spacer from "./Spacer";
import Badge from "./Badge";
import BN from "bn.js";
import { Container, Wrapper, HeaderLink } from "./Root";
import styled from "react-emotion";
import { basePadding, colors } from "../styles";

const MessageContent = styled("div")`
  padding: ${basePadding}px;
  background-color: ${colors.lightBorderGrey};
  font-size: 1.3em;
`;

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
    console.log(this.message);
  }

  messageContent() {
    if (!this.message.revealSecret) return <div>Not revealed yet!</div>;
    return <div>Revealed!</div>;
  }

  get minReward() {
    if (!this.message) return new BN(0);
    const minReward = this.message.timeLockReward.div(
      new BN(this.message.totalFragments + 1)
    );
    return Eth.fromWei(minReward, "ether");
  }

  render() {
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
                <h3>Message Content:</h3>
                <Spacer size={0.5} />
                {this.message.messageContent ? (
                  <div>
                    <Badge color={colors.darkGreen}>
                      Revealed by {this.message.secretConstructor}
                    </Badge>
                    <Spacer size={0.5} />
                    {this.message.messageContent.substr(0, 5) === "data:" ? (
                      <img
                        src={this.message.messageContent}
                        style={{ maxWidth: "100%", maxHeight: 300 }}
                      />
                    ) : (
                      <MessageContent>
                        {this.message.messageContent}
                      </MessageContent>
                    )}
                  </div>
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
                {Eth.fromWei(
                  this.message.timeLockReward,
                  "ether"
                ).toString()}{" "}
                OPEN tokens (minimum reward per revealer is{" "}
                {this.minReward.toString()} OPEN)
              </div>
              <Spacer />
            </div>
          )}
        </Wrapper>
      </Container>
    );
  }
}
