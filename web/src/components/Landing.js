import React, { Component } from "react";
import { Link } from "react-router-dom";
import styled from "react-emotion";
import Spacer from "./Spacer";
import { basePadding, colors } from "../styles";
import streetSrc from "../assets/images/street.png";
import { Container, Wrapper } from "./Root";

const GetStartedLink = styled(Link)`
  font-size: 1.5em;
  color: ${colors.blue};
  border-bottom: 2px dotted ${colors.blue};

  &:hover {
    color: ${colors.green};
    border-bottom: 3px solid ${colors.blue};
    text-decoration: none;
  }
`;

const FooterLinks = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 1.2em;
`;

const FooterLink = styled("a")`
  color: ${colors.textBlack};
  border-bottom: 1px dotted ${colors.textBlack};

  &:hover {
    border-bottom: 2px solid ${colors.blue};
    color: ${colors.green};
    text-decoration: none;
  }
`;

const StreetLink = styled("a")`
  & img {
    height: ${basePadding * 3}px;
  }
`;

export default class Landing extends Component {
  render() {
    return (
      <Container>
        <Wrapper>
          <h1>Kimono Time Capsule</h1>
          <Spacer />
          <h2 style={{ fontWeight: 300 }}>
            A digital time capsule built on Ethereum. Add a secret message. Have
            the Kimono network collaborate to reconstruct it at a specific time
            in the future.
          </h2>
          <Spacer />
          <GetStartedLink to="/add">Add your own message &rarr;</GetStartedLink>
          <Spacer size={3} />
          <FooterLinks>
            <div>
              Links:
              <Spacer inline size={0.5} />
              <FooterLink
                href="https://github.com/hillstreetlabs/kimono"
                target="_blank"
              >
                Github
              </FooterLink>
              <Spacer inline size={0.5} />
              <FooterLink href="/faucet">OPEN Faucet</FooterLink>
            </div>
            <StreetLink href="https://hillstreetlabs.com/" target="_blank">
              <img src={streetSrc} />
            </StreetLink>
          </FooterLinks>
        </Wrapper>
      </Container>
    );
  }
}
