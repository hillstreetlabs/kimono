import styled, { css } from "react-emotion";

const basePadding = 20;

const spacerSize = (pads, props) => {
  return css`
    ${props.inline ? "width:" : "height:"} ${basePadding * pads}px;
  `;
};

export default styled("div")`
  ${props => {
    if (props.big) return spacerSize(2, props);
    if (props.small) return spacerSize(0.5, props);
    if (props.size) return spacerSize(props.size, props);
    return spacerSize(1, props);
  }};
  ${props =>
    props.inline &&
    `
    display: inline-block;
  `};
`;
