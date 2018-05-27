import { colors } from "../styles";
import styled from "react-emotion";

const buttonColors = {
  grey: "#eee",
  yellow: colors.yellow,
  green: colors.darkGreen,
  blue: "blue",
  black: "black"
};

const Button = styled.button`
  cursor: pointer;
  padding: 0.85em 1.25em;
  background-color: ${buttonColors.green};
  border: 0 none;
  font-size: 0.875em;
  color: white;

  &:hover {
    background-color: ${buttonColors.blue};
    color: white;
  }
  &:active {
    background-color: ${buttonColors.black};
    color: white;
  }
  &:disabled {
    pointer-events: none;
    opacity: 0.7;
  }
  ${props =>
    props.block &&
    `
    display: block;
    width: 100%;
    text-align: center;
  `};
  ${props => props.big && `font-size: 24px;`};
`;

export default Button;
