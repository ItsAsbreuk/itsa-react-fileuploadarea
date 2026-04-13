"use strict";

require("ypromise");

const React = require("react"),
    ReactDOM = require("react-dom"),
    FileUploadArea = require("./lib/component-styled.jsx");

const props = {
    url: "http://imageuploader.itsa.io/procesimage",
    areaText: "Drop your files here or click to browse",
    errorMsg: "you can only select a png-file",
    helpText: "png-files only",
    maxFileSize: 15*1024*1024, // 15mb
    autoFocus: true,
    onFileChange: function(e) {
        props.validated = (e.target.getFiles()[0].type==="image/png");
        render();
        // reset the error-message next to the fileupload-area:
        propsMsg.msg = "";
        renderMsg();
    },
    onError: function(err) {
        propsMsg.msg = "Error: "+err.message;
        renderMsg();
    }
};

const propsMsg = {
    msg: ""
};

class Msg extends React.Component {
    render() {
        return (
            <div>{this.props.msg}</div>
        );
    }
}

var render = function() {
    ReactDOM.render(
        <FileUploadArea {...props} />,
        document.getElementById("component-container1")
    );
};

var renderMsg = function() {
    ReactDOM.render(
        <Msg {...propsMsg} />,
        document.getElementById("message-container")
    );
};

render();
renderMsg();
