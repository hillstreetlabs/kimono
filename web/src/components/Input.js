import styled from "react-emotion";
import { colors, darken } from "../styles";

export default styled("input")`
  padding: 1em 0.85em;
  border: 2px solid ${colors.lightBorderGrey};
  font-size: 1em;
  width: 100%;
  &:focus {
    border: 2px solid ${darken(colors.lightBorderGrey, 10)};
  }
`;
