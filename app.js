"use strict";

const React = require("react"),
    ReactDOM = require("react-dom"),
    Component = require("./lib/component-styled.jsx");

const props = {

};

ReactDOM.render(
    <Component {...props} />,
    document.getElementById("component-container")
);
