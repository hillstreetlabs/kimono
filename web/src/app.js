import React from "react";
import ReactDOM from "react-dom";
import { injectGlobal } from "emotion";
import Root from "./Root";
import "whatwg-fetch";

injectGlobal`
  body {
    margin: 0;
    font-weight: 400;
    font-family: system-ui, sans-serif;
  }
  h1, h2, h3, h4, h5 {
    margin: 0;
  }
  p {
    margin: 0;
  }
  div,
  input,
  textarea {
    box-sizing: border-box;
  }
  a,
  button {
    cursor: pointer;
    &:focus,
    &:active {
      outline: none;
    }
  }
  textarea:focus,
  input:focus {
    outline: none;
  }
  a, a:visited {
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

let rootElement = document.getElementById("app");

window.onload = () => {
  ReactDOM.render(<Root />, rootElement);
};

if (module.hot) {
  module.hot.accept("./Root", () => {
    ReactDOM.render(<Root />, rootElement);
  });
}
