import React, { Component } from "react";
import { Link } from "react-router-dom";

export default class Landing extends Component {
  render() {
    return (
      <div>
        Kimono <Link to="/demo">Try it out &rarr;</Link>
      </div>
    );
  }
}
