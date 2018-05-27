import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import { action, observable } from "mobx";
import { Link } from "react-router-dom";
import Spacer from "./Spacer";
import Button from "./Button";
import Input from "./Input";
import Textarea from "./Textarea";
import Upload from "./Upload";
import BN from "bn.js";
import { Container, Wrapper, HeaderLink } from "./Root";
import styled, { keyframes } from "react-emotion";
import { basePadding, colors, lighten } from "../styles";

const Flex = styled("div")`
  display: flex;
  width: 100%;

  & > div {
    width: 50%;
  }
`;

const gentlePulseColor = keyframes`
  0% { background-color: ${colors.darkGreen}; }
  45% { background-color: ${lighten(colors.blue, 20)}; }
  100% {background-color: ${colors.darkGreen};  }
`;

const BigTextarea = styled(Textarea)`
  font-size: 1.3em;
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
export default class AddMessage extends Component {
  @observable currentBlockNumber;
  @observable createMessageStatus = "none";
  @observable showAdvancedOptions = false;
  @observable
  newMessage = {
    secret: null,
    revealAtBlock: "",
    revealPeriod: 10,
    messageContent: "",
    minFragments: 3,
    totalFragments: 5,
    reward: new BN(10000)
  };
  @observable transactionHash = null;
  @observable isFile = false;
  fileSrc = null;

  componentDidMount() {
    this.getBlockNumber();
  }

  async getBlockNumber() {
    const currentBlock = (await this.props.store.eth.blockNumber()).toNumber();
    this.newMessage.revealAtBlock = currentBlock + 10;
    this.currentBlockNumber = currentBlock;
  }

  async generateSecretKey() {
    this.newMessage.secret = await this.props.store.generateSecretKey();
  }

  async createMessage() {
    this.createMessageStatus = "preparing";
    const response = await this.props.store.kimono.createMessage(
      this.newMessage,
      { from: this.props.store.currentUser.address }
    );
    this.createMessageStatus = "confirming";
    const transactionReceipt = await response.getReceipt();
    const creationEvent = transactionReceipt.events.filter(
      log => log._eventName === "MessageCreation"
    )[0];
    this.props.history.push(`/${creationEvent.nonce.toString()}`);
  }

  @action
  handleContentBytes(bytes, dataUrl) {
    this.isFile = true;
    this.fileSrc = dataUrl;
    this.newMessage.messageContent = bytes;
  }

  handleContentChange(e) {
    this.newMessage.messageContent = e.target.value;
  }

  handleRevealAtBlockChange(e) {
    this.newMessage.revealAtBlock = parseInt(e.target.value);
  }

  handleTotalFragmentsChange(e) {
    this.newMessage.totalFragments = parseInt(e.target.value);
  }

  handleMinFragmentsChange(e) {
    this.newMessage.minFragments = parseInt(e.target.value);
  }

  toggleAdvancedOptions() {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  render() {
    return (
      <Container>
        <Wrapper color={colors.green}>
          <h1>
            <HeaderLink to="/">Kimono Time Capsule</HeaderLink> >{" "}
            <span style={{ fontWeight: 300 }}>New Message</span>
          </h1>
          <Spacer />
          <div>
            <h3>Author:</h3>
            <p>{this.props.store.currentUser.address}</p>
          </div>
          <Spacer />
          <div>
            <h3>Author signature:</h3>
            <Spacer size={0.5} />
            {this.newMessage.secret || (
              <Button onClick={() => this.generateSecretKey()}>
                Generate Secret
              </Button>
            )}
          </div>
          <Spacer />
          <div>
            <h3>Block to be revealed</h3>
            <p>Note: the current block is {this.currentBlockNumber}</p>
            <Spacer size={0.5} />
            <Input
              onChange={e => this.handleRevealAtBlockChange(e)}
              value={this.newMessage.revealAtBlock}
            />
          </div>
          <Spacer />
          <div>
            <h3>Message content:</h3>
            <Spacer size={0.5} />
            <Upload
              onDrop={(bytes, dataUrl) =>
                this.handleContentBytes(bytes, dataUrl)
              }
            >
              {this.isFile ? (
                <img
                  src={this.fileSrc}
                  style={{ maxWidth: "100%", maxHeight: 300 }}
                />
              ) : (
                <BigTextarea
                  placeholder="So what's something you've never told anyone?"
                  onChange={e => this.handleContentChange(e)}
                  value={this.newMessage.messageContent}
                />
              )}
            </Upload>
          </div>
          <Spacer />
          {this.showAdvancedOptions && (
            <div>
              <Flex>
                <div>
                  <h3>Total secret fragments:</h3>
                  <Spacer size={0.5} />
                  <Input
                    onChange={e => this.handleTotalFragmentsChange(e)}
                    value={this.newMessage.totalFragments}
                  />
                </div>
                <div>
                  <h3>Minimum fragments needed to reconstruct:</h3>
                  <Spacer size={0.5} />
                  <Input
                    onChange={e => this.handleMinFragmentsChange(e)}
                    value={this.newMessage.minFragments}
                  />
                </div>
              </Flex>
              <Spacer />
            </div>
          )}
          <div style={{ fontSize: "1.4em" }}>
            <AnimatedButton
              disabled={
                !this.newMessage.secret || this.createMessageStatus != "none"
              }
              onClick={() => this.createMessage()}
              loading={this.createMessageStatus != "none"}
            >
              {this.createMessageStatus === "none" && (
                <span>Create message &rarr;</span>
              )}
              {this.createMessageStatus === "preparing" && (
                <span>Preparing message...</span>
              )}
              {this.createMessageStatus === "confirming" && (
                <span>Confirming transaction...</span>
              )}
            </AnimatedButton>

            <Spacer inline />
            <small>
              <a onClick={() => this.toggleAdvancedOptions()}>
                {this.showAdvancedOptions ? "Hide" : "Show"} Advanced Options
              </a>
            </small>
          </div>
        </Wrapper>
      </Container>
    );
  }
}
