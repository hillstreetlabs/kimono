import tinycolor from "tinycolor2";
import { css } from "react-emotion";

export const lighten = (color, perc) => {
  return tinycolor(color)
    .lighten(perc)
    .toString();
};

export const darken = (color, perc) => {
  return tinycolor(color)
    .darken(perc)
    .toString();
};

export const hue = (color1, color2, amount) => {
  return tinycolor.mix(color1, color2, amount).toString();
};

export const complement = color => {
  return tinycolor(color)
    .complement()
    .toString();
};

export const transform = arg => {
  return css`
    -ms-transform: ${arg}; /* IE 9 */
    -webkit-transform: ${arg}; /* Safari */
    transform: ${arg};
  `;
};

export const filter = arg => {
  return css`
    -webkit-filter: ${arg};
    -moz-filter: ${arg};
    -o-filter: ${arg};
    -ms-filter: ${arg};
    filter: ${arg};
  `;
};
