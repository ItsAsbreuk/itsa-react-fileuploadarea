File upload drop-area for react, fully interchangeable with itsa-react-fileuploadbutton.

Instead of a button, it renders a drop zone where users can drag-and-drop files (with a click fallback to open a file picker).

It has the following features:

* Drag-and-drop file selection
* Click to browse fallback
* Abortable
* CORS support
* IE8+ support
* Progress-status (IE10+)
* Ultrafast upload by splitting the file(s) in chunks
* Focussable
* Aria-support (automaticly)
* Fully interchangeable with `itsa-react-fileuploadbutton` (same props & API)


## Different modes

The upload-area uses XHR2 by default and falls back into using a form-submit mode (`multipart/form-data`).
You can force the `form-submit` mode, by setting the prop `formSubmitMode` `true`. This is NOT recomended:

#### Advantages `formSubmitMode`:
* Easy setup serverside (no file-chunks)

#### Disadvantages `formSubmitMode`:
* No file-chunks, therefore no highspeed upload
* No onProgress
* When CORS, the uploader is unable to detect reponse-errors, leading into the callback of onSuccess in case of a network-error.

Best usage is `same-origin` with `formSubmitMode`=false (which is the default).


## How to use:

```js
"use strict";

const React = require("react"),
    ReactDOM = require("react-dom"),
    FileUploadArea = require("./lib/component-styled.jsx");

const props = {
    url: "http://yourdomain.com/procesimage",
    areaText: "Drop your files here or click to browse",
    errorMsg: "you can only select a png-file",
    helpText: "png-files only",
    maxFileSize: 15*1024*1024, // 15mb
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

const Msg = React.createClass({
    render() {
        return (
            <div>{this.props.msg}</div>
        );
    }
});

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
```

## Interchangeability with itsa-react-fileuploadbutton

This component accepts all the same props as `itsa-react-fileuploadbutton` and exposes the same public API:

### Methods:
* `send()` - Send the selected files
* `abort(reset)` - Abort the transfer
* `reset()` - Reset the selected files
* `count()` - Number of currently selected files
* `getFiles()` - Get the currently selected files
* `getLastSent()` - Get the last sent files
* `getTotalFileSize()` - Total size of selected files
* `hasFiles()` - Whether files are selected
* `reactivate()` - Reactivate after `uploadOnlyOnce`
* `focus()` - Focus the component

### Additional props (area-specific):
* `areaText` - Text shown in the drop zone (default: "Drop files here or click to browse")
* `areaHTML` - HTML content in the drop zone
* `activeText` - Text shown while dragging over (default: "Drop files here")
* `activeHTML` - HTML content while dragging over

## About the css

You need the right css in order to make use of `itsa-react-fileuploadarea`. There are 2 options:

1. You can use the css-files inside the `css`-folder
2. You can use: `Component = require("itsa-react-fileuploadarea/lib/component-styled.jsx");` and build your project with `webpack`. This is needed, because you need the right plugin to handle a requirement of the `scss`-file.


## Setting up the server

Server setup is identical to `itsa-react-fileuploadbutton`. See that module's README for details, or use `itsa-fileuploadhandler`.


#### If you want to express your appreciation

Feel free to donate to one of these addresses; my thanks will be great :)

* Ether: 0xE096EBC2D19eaE7dA8745AA5D71d4830Ef3DF963
* Bitcoin: 37GgB6MrvuxyqkQnGjwxcn7vkcdont1Vmg