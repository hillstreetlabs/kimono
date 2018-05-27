import styled from "react-emotion";
import { colors, darken } from "../styles";

export default styled("textarea")`
  padding: 1em 0.85em;
  border: 2px solid ${colors.lightBorderGrey};
  font-size: 0.85em;
  width: 100%;
  resize: vertical;

  &:focus {
    border: 2px solid ${darken(colors.lightBorderGrey, 10)};
  }
`;
