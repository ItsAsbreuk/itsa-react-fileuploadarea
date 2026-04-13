"use strict";

/**
 * React-component: File upload drop-area.
 *
 * Fully interchangeable with itsa-react-fileuploadbutton:
 * accepts all the same props and exposes the same public API.
 * Instead of a button, it renders a drop zone where users can
 * drag-and-drop files (with a click fallback to open the file picker).
 *
 *
 * <i>Copyright (c) 2016 ItsAsbreuk - http://itsasbreuk.nl</i><br>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 *
 * @module itsa-react-fileuploadarea
 * @class FileUploadArea
 * @since 0.0.1
*/

const React = require("react"),
    PropTypes = require("prop-types"),
    utils = require("itsa-utils"),
    itsaReactCloneProps = require("itsa-react-clone-props"),
    isNode = utils.isNode,
    io = !isNode && require("itsa-fetch").io,
    FileLikeObject = require("./file-like-object"),
    idGenerator = utils.idGenerator,
    later = utils.later,
    async = utils.async,
    MAIN_CLASS = "itsa-fileuploadarea",
    MAIN_CLASS_PREFIX = MAIN_CLASS+"-",
    SPACED_MAIN_CLASS_PREFIX = " "+MAIN_CLASS_PREFIX,
    NOOP = () => {},
    DEF_MAX_SIZE = 100*1024*1024, // 100 Mb
    ABORTED = "Request aborted",
    XHR2support = !isNode && ("withCredentials" in new XMLHttpRequest()),
    DEF_AREA_TEXT = "Drop files here or click to browse",
    DEF_ACTIVE_TEXT = "Drop files here";

class Component extends React.Component {
    constructor(props) {
        super(props);
        const instance = this;
        instance.state = {
            inputElement: true,
            isDraggingOver: false,
            isUploading: false,
            percent: null,
            serverError: "",
            serverSuccess: false
        };
        instance._droppedFiles = null;
        instance.abort = instance.abort.bind(instance);
        instance.count = instance.count.bind(instance);
        instance.focus = instance.focus.bind(instance);
        instance.getFiles = instance.getFiles.bind(instance);
        instance.getLastSent = instance.getLastSent.bind(instance);
        instance.getTotalFileSize = instance.getTotalFileSize.bind(instance);
        instance.handleContainerFocus = instance.handleContainerFocus.bind(instance);
        instance.hasFiles = instance.hasFiles.bind(instance);
        instance.reactivate = instance.reactivate.bind(instance);
        instance.reset = instance.reset.bind(instance);
        instance.send = instance.send.bind(instance);
        instance._clearRemoveTimer = instance._clearRemoveTimer.bind(instance);
        instance._getLargestFileSize = instance._getLargestFileSize.bind(instance);
        instance._getSizeValidationMsg = instance._getSizeValidationMsg.bind(instance);
        instance._handleAreaClick = instance._handleAreaClick.bind(instance);
        instance._handleDragEnter = instance._handleDragEnter.bind(instance);
        instance._handleDragOver = instance._handleDragOver.bind(instance);
        instance._handleDragLeave = instance._handleDragLeave.bind(instance);
        instance._handleDrop = instance._handleDrop.bind(instance);
        instance._handleError = instance._handleError.bind(instance);
        instance._handleFileChange = instance._handleFileChange.bind(instance);
        instance._handleSuccess = instance._handleSuccess.bind(instance);
        instance._iframeError = instance._iframeError.bind(instance);
        instance._iframeLoad = instance._iframeLoad.bind(instance);
        instance._renderInputElement = instance._renderInputElement.bind(instance);
        instance._renderFormElement = instance._renderFormElement.bind(instance);
        instance._renderIframe = instance._renderIframe.bind(instance);
        instance._setRemoveTimer = instance._setRemoveTimer.bind(instance);
        instance._storeLastSent = instance._storeLastSent.bind(instance);
    }

    /**
     * Aborts the transfer (if files are being sent).
     *
     * @method abort
     * @params reset {Boolean} Whether to clean the file-list
     * @since 0.0.1
    */
    abort(reset) {
        // because, inside `onSend`, this._io might not be set yet, we need to go async:
        async(() => {
            this._io && this._io.abort();
            reset && this.reset();
        });
    }

    /**
     * Returns the number of files that are currently selected.
     *
     * @method count
     * @return {number} Number of files currently selected
     * @since 0.0.1
    */
    count() {
        return this.getFiles().length;
    }

    /**
     * componentWillMount does some initialization.
     *
     * @method componentWillMount
     * @since 0.0.1
     */
    componentWillMount() {
        this._iframeName = idGenerator("itsa-iframe");
        this._lastfiles = [];
    }

    /**
     * componentDidMount does some initialization.
     *
     * @method componentDidMount
     * @since 0.0.1
     */
    componentDidMount() {
        const instance = this;
        instance._onlyOnceUploaded = false;
        instance.props.autoFocus && instance.focus();
    }

    /**
     * componentWilUnmount does some cleanup.
     *
     * @method componentWillUnmount
     * @since 0.0.1
     */
    componentWillUnmount() {
        const instance = this;
        instance._clearRemoveTimer();
        instance._io && instance._io.abort();
    }

    /**
     * Sets the focus on the Component.
     *
     * @method focus
     * @chainable
     * @since 0.0.1
     */
    focus() {
        this._areaNode && this._areaNode.focus();
        return this;
    }

    /**
     * Returns the currently selected files. When files were dropped, returns
     * the dropped files. Otherwise falls back to the hidden input element.
     *
     * @method getFiles
     * @return {Array-like} protected list of files
     * @since 0.0.1
    */
    getFiles() {
        if (this._droppedFiles && this._droppedFiles.length > 0) {
            return this._droppedFiles;
        }
        return this._inputNode ? (this._inputNode.files || [FileLikeObject.createFile(this._inputNode)]) : [];
    }

    /**
     * Returns the last send-files.
     * This is handy to know, because after transmission, getFiles() will return empty.
     * This is an true Array with objects of this structure: {name: xxx, size: xxx}
     *
     * @method getLastSent
     * @return {Array} The last sent files
     * @since 0.0.1
    */
    getLastSent() {
        return this._lastfiles;
    }

    /**
     * Returns the total size of all files that are currently selected.
     *
     * @method getTotalFileSize
     * @return {Number} The size of all files in bytes
     * @since 0.0.1
    */
    getTotalFileSize() {
        var instance = this,
            files = instance.getFiles(),
            len = files.length,
            total = 0,
            i, file;
        for (i=0; i<len; i++) {
            file = files[i];
            total += file.size;
        }
        return total;
    }

    /**
     * Callback that sets the focus to the descendent element by calling `focus()`
     *
     * @method handleContainerFocus
     * @param e {Object} event-payload
     * @since 0.1.0
     */
    handleContainerFocus(e) {
        (e.target===e.currentTarget) && this.focus();
    }

    /**
     * Whether there are currently files selected.
     *
     * @method hasFiles
     * @return {number} Number of selected files
     * @since 0.0.1
    */
    hasFiles() {
        return (this.count()>0);
    }

    /**
     * Reactivates the upload-area in case a file has been uploaded and a new upload
     * cannot be done because of the props: `uploadOnlyOnce` was set `true`
     *
     * Is only usable in combination with `uploadOnlyOnce===true`
     *
     * @method reactivate
     * @chainable
     * @since 0.0.6
     */
    reactivate() {
        this._onlyOnceUploaded = false;
        return this;
    }

    /**
     * React render-method --> renderes the Component.
     *
     * @method render
     * @return ReactComponent
     * @since 0.0.1
     */
    render() {
        let mainclass = MAIN_CLASS,
            errorMsg, help, iframe, formElement, sizeValidationMsg, areaClassName,
            classNameProgressBar, classNameProgressBarInner, progressBarInnerStyles,
            errMessage, areaContent, areaInnerHTML;
        const instance = this,
              state = instance.state,
              serverError = state.serverError,
              props = itsaReactCloneProps.clone(instance.props),
              serverSuccess = state.serverSuccess && props.validated,
              markServerSuccess = (props.markSuccess && serverSuccess) || (props.showSuccess && !serverError),
              XHR2 = (XHR2support && !props.formSubmitMode),
              showProgress = props.showProgress,
              uploadBlocked = props.uploadOnlyOnce && instance._onlyOnceUploaded,
              disabled = props.disabled || state.isUploading || uploadBlocked,
              onProgress = props.onProgress;

        props.containerClass && (mainclass+=" "+props.containerClass);

        areaClassName = MAIN_CLASS_PREFIX+"dropzone";
        props.className && (areaClassName+=" "+props.className);

        if (markServerSuccess) {
            areaClassName += " "+MAIN_CLASS_PREFIX+"feedback-success";
        }
        else if (!instance.hasFiles() && !serverSuccess) {
            props.markRequired && (areaClassName+=" "+MAIN_CLASS_PREFIX+"required");
        }

        // Determine area content
        if (state.isDraggingOver) {
            areaContent = props.activeText || DEF_ACTIVE_TEXT;
            areaInnerHTML = props.activeHTML;
        }
        else {
            areaContent = props.areaText || DEF_AREA_TEXT;
            areaInnerHTML = props.areaHTML;
        }

        if (XHR2 && (typeof state.percent==="number")) {
            classNameProgressBar = MAIN_CLASS_PREFIX+"progress";
            classNameProgressBarInner = classNameProgressBar + "-inner";
            serverSuccess && (classNameProgressBar+=" "+classNameProgressBar+"-completed");
            progressBarInnerStyles = "margin-left: "+(state.percent-100)+"%";
        }

        sizeValidationMsg = instance._getSizeValidationMsg();
        if (serverError || (props.validated===false) || sizeValidationMsg) {
            errMessage = serverError || ((props.validated===false) ? props.errorMsg : sizeValidationMsg);
            errMessage && (errorMsg=(<div className={MAIN_CLASS_PREFIX+"error-text"}>{errMessage}</div>));
            areaClassName += SPACED_MAIN_CLASS_PREFIX+"error";
        }

        if (props.helpText && !errorMsg) {
            help = (<div className={MAIN_CLASS_PREFIX+"help-text"}>{props.helpText}</div>);
        }

        if (XHR2) {
            if (onProgress || showProgress) {
                instance.progressfn = function(data) {
                    let payload, percent;
                    const total = data.total,
                          loaded = data.loaded;
                    if (showProgress) {
                        percent = Math.round(100*(loaded/total));
                        instance.setState({
                            percent: percent
                        });
                    }
                    if (onProgress) {
                        payload = {
                            ioPromise: data.target,
                            target: instance,
                            total,
                            loaded
                        };
                        onProgress(payload);
                    }
                };
            }
            else {
                instance.progressfn = null;
            }
        }
        else {
            iframe = instance._renderIframe();
            formElement = instance._renderFormElement();
        }

        state.isDraggingOver && (areaClassName += " "+MAIN_CLASS_PREFIX+"drag-over");
        disabled && (mainclass+=" disabled");
        disabled && (areaClassName+=" "+MAIN_CLASS_PREFIX+"disabled");

        return (
            <div
                className={mainclass}
                onFocus={instance.handleContainerFocus}
                style={props.style} >
                {iframe}
                {formElement}
                <div
                    className={areaClassName}
                    onClick={disabled ? null : instance._handleAreaClick}
                    onDragEnter={disabled ? null : instance._handleDragEnter}
                    onDragOver={disabled ? null : instance._handleDragOver}
                    onDragLeave={disabled ? null : instance._handleDragLeave}
                    onDrop={disabled ? null : instance._handleDrop}
                    ref={node => instance._areaNode = node}
                    style={{width: props.width, height: props.height}}
                    tabIndex={props.tabIndex || 0} >
                    {areaInnerHTML ?
                        <div className={MAIN_CLASS_PREFIX+"content"} dangerouslySetInnerHTML={{__html: areaInnerHTML}} /> :
                        <div className={MAIN_CLASS_PREFIX+"content"}>{areaContent}</div>
                    }
                    {classNameProgressBar && (
                        <div className={classNameProgressBar}>
                            <div className={classNameProgressBarInner} style={{marginLeft: (state.percent-100)+"%"}} />
                        </div>
                    )}
                </div>
                {instance._renderInputElement()}
                {errorMsg}
                {help}
            </div>
        );
    }

    /**
     * Resets the selected file
     *
     * @method reset
     * @since 0.0.1
     */
    reset() {
        const instance = this;
        instance._droppedFiles = null;
        // the only way that works with ALL browsers, is by removing the DOMnode and replacing it.
        instance.setState({
            inputElement: false
        });
        async(() => {
            instance.setState({
                inputElement: true
            });
        });
    }

    /**
     * Send the selected files. Will also invoke the onSend callback, from within `e.preventDefault()` can be used.
     *
     * @method send
     * @return {Promise}
     * @since 0.0.1
    */

    send() {
        let hash = [],
            promisesById = {},
            prevented = false,
            promise, ioPromise, file, i, totalsize, originalProgressFn, options, params, url, errorMsg, returnPromise;
        const instance = this,
              props = instance.props,
              files = instance.getFiles(),
              len = files.length,
              XHR2 = (XHR2support && !props.formSubmitMode),
              onSend = props.onSend;

        instance._io && instance._io.abort();
        delete instance._io;

        if (props.validated===false) {
            errorMsg = "selected files are wrong validated";
        }
        else {
            errorMsg = instance._getSizeValidationMsg();
            if (!errorMsg && !instance.hasFiles()) {
                errorMsg = "no files selected";
            }
        }
        if (errorMsg) {
            delete instance._formsubmit;
            returnPromise = Promise.reject(errorMsg);
            returnPromise.catch(NOOP); // prevent uncaugth promise-error
            returnPromise.abort = NOOP;
            instance.forceUpdate(); // force to show the error
            return returnPromise;
        }

        // continue sending
        onSend && onSend({
                            preventDefault: () => {prevented = true;},
                            target: instance
                         });
        if (prevented) {
            delete instance._formsubmit;
            returnPromise = Promise.reject("default-prevented");
            returnPromise.abort = NOOP;
            return returnPromise;
        }

        if (!XHR2) {
            instance._io = Promise.itsa_manage();
            instance._io.abort = () => {
                // first abort the request:
                if (window.stop) {
                    window.stop();
                }
                else {
                    window.document.execCommand("Stop");
                }
                // now reject the request
                instance._io.reject(ABORTED);
            };
            instance._formsubmit = true;
            instance._formNode.submit();
        }
        else {
            options = props.requestOptions.itsa_deepClone();
            options.progressfn = instance.progressfn; // is set during `render`
            options.chunks = !props.formSubmitMode && props.chunks;
            params = props.params.itsa_deepClone();
            url = props.url;

            if (len===1) {
                file = files[0];
                promise = io.sendBlob(url, file, params, options);
            }
            else if (len>1) {
                if (options.progressfn) {
                    totalsize = 0;
                    originalProgressFn = options.progressfn;
                    options.progressfn = function(data) {
                        var promiseInstance = data.target,
                            totalLoaded = 0;
                        promisesById[promiseInstance._id] = data.loaded;
                        promisesById.itsa_each(function(value) {
                            totalLoaded += value;
                        });
                        originalProgressFn({
                            total: totalsize,
                            loaded: totalLoaded,
                            target: promise
                        });
                    };
                }
                // files is array-like, no true array
                for (i=0; i<len; i++) {
                    file = files[i];
                    ioPromise = io.sendBlob(url, file, params, options);
                    // we are interested in the total size of ALL files
                    if (options.progressfn) {
                        totalsize += file.size;
                        ioPromise._id = i;
                    }
                    hash.push(ioPromise);
                }
                // we need a manageable promise, because it has more methods than standard:
                promise = Promise.itsa_manage();
                Promise.itsa_finishAll(hash).then(function(response) {
                    var rejected = response.rejected;
                    rejected.some(function(ioError) {
                        if (ioError) {
                            promise.reject(ioError);
                            return true;
                        }
                    });
                    promise.fulfill(response.fulfilled);
                });

                promise.abort = function() {
                    if (!promise._aborted) {
                        hash.forEach(function(ioPromise) {
                            ioPromise.abort();
                        });
                        instance._io && instance._io.reject(ABORTED);
                        promise._aborted = true;
                    }
                };
            }
            else {
                // we need a manageable promise, because it has more methods than standard:
                promise = Promise.itsa_manage();
                promise.reject("No files selected");
                promise.abort = NOOP;
            }
            instance._io = promise;
            props.showProgress && this.setState({percent: 0});
        }
        if (props.emptyAfterSent && (len>0)) {
            // empty ON THE NEXT stack (not microstack), to ensure all previous methods are processing
            async(() => instance.reset());
        }
        instance._io.then(
            instance._handleSuccess,
            instance._handleError
        ).itsa_finally(() => delete instance._formsubmit);
        instance.setState({
            isUploading: true
        });
        return instance._io;
    }

    //==============================================================================
    //== private methods ===========================================================
    //==============================================================================

    /**
     * Clears the internal timer set by `_setRemoveTimer`
     *
     * @method _clearRemoveTimer
     * @private
     * @since 0.0.1
    */
    _clearRemoveTimer() {
        this._removeTimer && this._removeTimer.cancel();
    }

    /**
     * Returns the size of the largest file that is currently selected.
     *
     * @method _getLargestFileSize
     * @private
     * @return {Number} The size of the largest file in bytes
     * @since 0.0.1
    */
    _getLargestFileSize() {
        var instance = this,
            files = instance.getFiles(),
            len = files.length,
            largest = 0,
            i, file;
        for (i=0; i<len; i++) {
            file = files[i];
            (file.size>largest) && (largest=file.size);
        }
        return largest;
    }

    /**
     * Returns the validation-message when file-size is exceeded.
     *
     * @method _getSizeValidationMsg
     * @private
     * @return {String} Message in case limits are exceeded
     * @since 0.0.1
    */
    _getSizeValidationMsg() {
        let msg, fileMsg, filesizeMsg;
        const instance = this,
              props = instance.props,
              maxFileSize = props.maxFileSize,
              totalFileSize = props.totalFileSize;
        if (instance.hasFiles()) {
            if (maxFileSize && (instance._getLargestFileSize()>maxFileSize)) {
                fileMsg = props.multipleFiles ? "one of the files" : "selected file";
                filesizeMsg = Math.round(maxFileSize/1024);
                msg = fileMsg + " exceeds the maximum filesize of "+filesizeMsg+" KB";
            }
            else if (totalFileSize && (instance.getTotalFileSize()>totalFileSize)) {
                fileMsg = props.multipleFiles ? "the size of all files exceed" : "selected file exceeds";
                filesizeMsg = Math.round(totalFileSize/1024);
                msg = fileMsg + " the maximum of "+filesizeMsg+" KB";
            }
        }
        return msg;
    }

    /**
     * Callback whenever the drop-area gets clicked. Opens the file browser.
     *
     * @method _handleAreaClick
     * @private
     * @since 0.0.1
    */
    _handleAreaClick() {
        let prevented = false;
        const instance = this,
              props = instance.props,
              XHR2 = (XHR2support && !props.formSubmitMode),
              uploadBlocked = props.uploadOnlyOnce && instance._onlyOnceUploaded,
              onClick = instance.props.onClick;
        if (!isNode && !uploadBlocked && !this.state.isUploading) {
            onClick && onClick({
                                    preventDefault: () => {prevented = true;},
                                    target: instance
                               });
            instance._clearRemoveTimer();
            instance.setState({
                serverError: "",
                serverSuccess: false,
                percent: null
            });
            if (!prevented && XHR2) {
                instance._inputNode.click();
            }
        }
    }

    /**
     * Callback whenever a drag enters the drop-area.
     *
     * @method _handleDragEnter
     * @private
     * @param e {Object} event-payload
     * @since 0.0.1
    */
    _handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this._dragCounter = (this._dragCounter || 0) + 1;
        if (this._dragCounter === 1) {
            this.setState({isDraggingOver: true});
        }
    }

    /**
     * Callback whenever a drag is over the drop-area (needed to allow drop).
     *
     * @method _handleDragOver
     * @private
     * @param e {Object} event-payload
     * @since 0.0.1
    */
    _handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Callback whenever a drag leaves the drop-area.
     *
     * @method _handleDragLeave
     * @private
     * @param e {Object} event-payload
     * @since 0.0.1
    */
    _handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this._dragCounter = (this._dragCounter || 1) - 1;
        if (this._dragCounter === 0) {
            this.setState({isDraggingOver: false});
        }
    }

    /**
     * Callback whenever files are dropped on the drop-area.
     *
     * @method _handleDrop
     * @private
     * @param e {Object} event-payload
     * @since 0.0.1
    */
    _handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this._dragCounter = 0;
        const instance = this,
              props = instance.props,
              droppedFiles = e.dataTransfer.files;
        instance.setState({isDraggingOver: false});
        if (droppedFiles && droppedFiles.length > 0) {
            if (!props.multipleFiles && droppedFiles.length > 1) {
                // Only take the first file if multipleFiles is not enabled
                instance._droppedFiles = [droppedFiles[0]];
            }
            else {
                instance._droppedFiles = droppedFiles;
            }
            instance._clearRemoveTimer();
            instance.setState({
                serverError: "",
                serverSuccess: false,
                percent: null
            });
            instance._handleFileChange();
        }
    }

    /**
     * Error-Callback for the promised-request
     *
     * @method _handleError
     * @private
     * @params err {Object}
     * @since 0.0.1
    */
    _handleError(err) {
        const props = this.props,
              onError = props.onError,
              statusMsg = (Object.itsa_isObject(err) && err.status) ? err.status : ((typeof err==="string") ? err : "Error");
        statusMsg;
        if (onError) {
            onError({
                message: statusMsg,
                target: this
            });
        }
        this.setState({
            isUploading: false,
            percent: null,
            serverError: "server-error: " + statusMsg.toLowerCase(),
            serverSuccess: false
        });
        // remove progressBar after 1 second: when laid above the area the area can't be interacted with
        this._setRemoveTimer();
    }

    /**
     * Callback whenever files are changed (via drop or input selection). Will invoke `onFileChange` when present.
     * If the property `autoSend` is true (and `onFileChange` did no `preventDefault()`), then the `send()`-method gets invoked.
     *
     * @method _handleFileChange
     * @private
     * @since 0.0.1
    */
    _handleFileChange() {
        let prevented = false;
        const instance = this,
              props = instance.props,
              onFileChange = props.onFileChange;
        onFileChange && onFileChange({
            preventDefault: () => {prevented = true;},
            target: instance
        });
        if (props.autoSend && !prevented) {
            // going async --> props.validated might have changed --> it should be implemented first
            async(() => instance.send());
        }
    }

    /**
     * Success-Callback for the promised-request
     *
     * @method _handleSuccess
     * @private
     * @params data {Object}
     * @since 0.0.1
    */
    _handleSuccess(data) {
        let responseObject;
        const instance = this,
              props = instance.props,
              onSuccess = props.onSuccess;
        instance._onlyOnceUploaded = true;
        if (onSuccess) {
            responseObject = data.itsa_deepClone();
            responseObject.target = instance;
            onSuccess(responseObject);
        }
        instance.setState({
            isUploading: false,
            percent: 100,
            serverError: "",
            serverSuccess: true
        });
        // remove progressBar after 1 second
        instance._setRemoveTimer();
    }

    /**
     * Callback whenever the iframe recieves an error (most likely by an invalid server-response).
     * Will abort the request-promise.
     *
     * @method _iframeError
     * @private
     * @since 0.0.1
    */
    _iframeError() {
        this._io.abort();
    }

    /**
     * Callback whenever the iframe recieves a response from the server. Depending on the response, it will
     * either fulfill or reject the request-promise.
     *
     * @method _iframeLoad
     * @private
     * @since 0.0.1
    */
    _iframeLoad() {
        let content, contentObj;
        const instance = this,
              okStatus= {status: "OK"};
        if (instance._formsubmit) {
            try {
                content = instance._iframeNode.contentWindow.document.body.innerHTML || "";
                // remove anything but the json response:
                content = content.substring(content.indexOf("{"), content.lastIndexOf("}")+1);
                try {
                    contentObj = JSON.parse(content);
                }
                catch (err) {
                    contentObj = {
                        status: "ERROR",
                        message: err.message || err.msg || "no valid JSON response"
                    }
                }
                if (contentObj.status==="OK") {
                    instance._io.fulfill(contentObj);
                }
                else {
                    instance._io.reject(contentObj.message || "server did not accept the files");
                }
            }
            catch(err) {
                // CORS is active --> we are unable to determine the response, so we need to fulfill the request:
                instance._io.fulfill(okStatus);
            }
        }
    }

    /**
     * Renderes the hidden HTMLInputElement (used as click-to-browse fallback).
     *
     * @method _renderInputElement
     * @private
     * @return {Component} The Input-element (jsx)
     * @since 0.0.1
    */
    _renderInputElement() {
        const instance = this,
              props = instance.props,
              inputStyles = {display: "none"};
        if (!this.state.inputElement) {
            return (<div style={inputStyles} />);
        }
        return (
            <input
                multiple={props.multipleFiles}
                onChange={instance._handleFileChange}
                name="uploadfiles"
                ref={node => instance._inputNode = node}
                style={inputStyles}
                type="file" />
        );
    }

    /**
     * Renderes a HTMLFormElement (in case no XHR2 is used)
     *
     * @method _renderFormElement
     * @private
     * @return {Component} The Form-element (jsx)
     * @since 0.0.1
    */
    _renderFormElement() {
        let inputElement;
        const instance = this,
              props = instance.props,
              hiddenStyles = {display: "none"},
              hiddenFields = [];

        props.params.itsa_each((value, key) => {
            let keyValue;
            try {
                keyValue = (typeof value==="object") ? JSON.stringify(value) : String(value);
            }
            catch(err) {
                keyValue = null;
            }
            hiddenFields.push(<input key={key} type="hidden" name={key} value={keyValue} />);
        });
        inputElement = (
            <input
                multiple={props.multipleFiles}
                onChange={instance._handleFileChange}
                name="uploadfiles"
                ref={node => instance._inputNode = node}
                style={{fontSize: "10000%", width: "100%", height: "100%", opacity: "0", filter: "alpha(opacity=0)", cursor: "pointer", position: "absolute", zIndex: "1"}}
                type="file" />
        );
        return (
            <form
                action={props.url}
                encType="multipart/form-data"
                method="post"
                noValidate={true}
                ref={node => instance._formNode = node}
                style={hiddenStyles}
                target={instance._iframeName} >
                {hiddenFields}
                {inputElement}
            </form>
        );
    }

    /**
     * Renderes an iFrame-element (in case no XHR2 is used), which is needed for the response-target of the form-submission.
     *
     * @method _renderIframe
     * @private
     * @return {Component} The iframe-element (jsx)
     * @since 0.0.1
    */
    _renderIframe() {
        const instance = this,
              iframeStyles = {display: "none"};
        return (
            <iframe
                src={instance.props.url}
                ref={node => instance._iframeNode = node}
                name={instance._iframeName}
                onLoad={instance._iframeLoad}
                onError={instance._iframeError}
                style={iframeStyles} />
        );
    }

    /**
     * Sets a timer that will remove the progress-bar.
     *
     * @method _setRemoveTimer
     * @private
     * @since 0.0.1
    */
    _setRemoveTimer() {
        this._removeTimer = later(() => this.setState({percent: null}), 1050);
    }

    /**
     * Stores the files that are sent into an internal hash, which can be read by `getLastSent()`.
     *
     * @method _storeLastSent
     * @private
     * @since 0.0.1
    */
    _storeLastSent() {
        var instance = this,
            files = instance.getFiles(),
            len = files.length,
            i, file;
        instance._lastfiles.length = 0;
        for (i=0; i<len; i++) {
            file = files[i];
            instance._lastfiles.push({
                name: file.name,
                size: file.size
            });
        }
        return instance;
    }

}

Component.propTypes = {
    /**
     * The text shown inside the drop-area when files are being dragged over it.
     *
     * @property activeHTML
     * @type String
     * @since 0.0.1
    */
    activeHTML: PropTypes.string,

    /**
     * The text shown inside the drop-area when files are being dragged over it (escaped).
     *
     * @property activeText
     * @type String
     * @since 0.0.1
    */
    activeText: PropTypes.string,

    /**
     * The HTML content shown inside the drop-area (not escaped).
     *
     * @property areaHTML
     * @type String
     * @since 0.0.1
    */
    areaHTML: PropTypes.string,

    /**
     * The text shown inside the drop-area (escaped).
     *
     * @property areaText
     * @type String
     * @since 0.0.1
    */
    areaText: PropTypes.string,

    /**
     * The aria-label.
     *
     * @property aria-label
     * @type String
     * @since 0.0.1
    */
    "aria-label": PropTypes.string,

    /**
     * Whether to autofocus the Component.
     *
     * @property autoFocus
     * @type Boolean
     * @since 0.0.1
    */
    autoFocus: PropTypes.bool,

    /**
     * Whether to automaticly send the file(s) after being selected. When set `false`, you need to manually send the files
     * with the `send`-method.
     *
     * @property autoSend
     * @type Boolean
     * @since 0.0.1
    */
    autoSend: PropTypes.bool,

    /**
     * The Button-text, retaining html-code.
     * Accepted for interchangeability with fileuploadbutton, but not rendered visually.
     *
     * @property buttonHTML
     * @type String
     * @since 0.0.1
    */
    buttonHTML: PropTypes.string,

    /**
     * The Button-text.
     * Accepted for interchangeability with fileuploadbutton, but not rendered visually.
     *
     * @property buttonText
     * @type String
     * @since 0.0.1
    */
    buttonText: PropTypes.string,

    /**
     * The class that should be set on the drop-area
     *
     * @property className
     * @type String
     * @since 0.0.1
    */
    className: PropTypes.string,

    /**
     * Whether to send the files in smaller pieces (chunks), which will drastically increase uploadtime.
     * Note however, that you need serverside code to put the pieces together again.
     * If `formSubmitMode` or IE<10, chunks will be set false.
     *
     * @property chunks
     * @type bool
     * @default: false
     * @since 15.2.29
    */
    chunks: PropTypes.bool,

    /**
     * The class that should be set on the container-component
     *
     * @property containerClass
     * @type String
     * @since 15.2.29
    */
    containerClass: PropTypes.string,

    /**
     * Whether the area is disabled
     *
     * @property disabled
     * @type Boolean
     * @since 0.0.1
    */
    disabled: PropTypes.bool,

    /**
     * Whether to empty the file(s) after sent to the server.
     * Default: true
     *
     * @property emptyAfterSent
     * @type Boolean
     * @since 0.0.1
    */
    emptyAfterSent: PropTypes.bool,

    /**
     * The error-message that appears when the element is wrong validated.
     *
     * @property errorMsg
     * @type String
     * @since 0.0.1
    */
    errorMsg: PropTypes.string,

    /**
     * To force the component to use form-submit instead of XHR2. This is NOT recomended.
     * In case the browser does not support XHR2, it will automaticly fall back to form-submit.
     * Default: false
     *
     * @property formSubmitMode
     * @type Boolean
     * @since 0.0.1
    */
    formSubmitMode: PropTypes.bool,

    /**
     * The height of the drop-area.
     *
     * @property height
     * @type String
     * @default "200px"
     * @since 17.0.2
    */
    height: PropTypes.string,

    /**
     * Help text to assist. Appears just below the area.
     *
     * @property helpText
     * @type String
     * @since 0.0.1
    */
    helpText: PropTypes.string,

    /**
     * Whether the Component should show an validate-reclamation (star)
     *
     * @property markRequired
     * @type Boolean
     * @since 0.0.1
    */
    markRequired: PropTypes.bool,

    /**
     * Whether to mark the Component when the file(s) are successfully sent.
     * This property will be overrulled whenever `props.showSuccess` is true.
     *
     * @property markSuccess
     * @type Boolean
     * @since 0.0.1
    */
    markSuccess: PropTypes.bool,

    /**
     * The maximum allowed file-size of each separate file.
     *
     * @property maxFileSize
     * @type Number
     * @since 0.0.1
    */
    maxFileSize: PropTypes.number,

    /**
     * Whether to support the selection of multiple files.
     *
     * @property multipleFiles
     * @type Boolean
     * @since 0.0.1
    */
    multipleFiles: PropTypes.bool,

    /**
     * The `name` for the element.
     *
     * @property name
     * @type String
     * @since 0.0.1
    */
    name: PropTypes.string,

    /**
     * The `onBlur` function, when happening on the DOM-Element.
     *
     * @property onBlur
     * @type Function
     * @since 0.1.0
    */
    onBlur: PropTypes.func,

    /**
     * The `onClick` function, when happening on the DOM-Element.
     *
     * @property onClick
     * @type Function
     * @since 0.0.1
    */
    onClick: PropTypes.func,

    /**
     * The `onError` function, when filetransfer errors.
     *
     * @property onError
     * @type Function
     * @since 0.0.1
    */
    onError: PropTypes.func,

    /**
     * The `onFileChange` function, when the users has selected files.
     *
     * @property onFileChange
     * @type Function
     * @since 0.0.1
    */
    onFileChange: PropTypes.func,

    /**
     * The `onFocus` function, when the Component gets focussed.
     *
     * @property onFocus
     * @type Function
     * @since 0.1.0
    */
    onFocus: PropTypes.func,

    /**
     * The `onProgress` function: callback during tranfer.
     *
     * @property onProgress
     * @type Function
     * @since 0.0.1
    */
    onProgress: PropTypes.func,

    /**
     * The `onSend` function, when the transfer starts.
     *
     * @property onSend
     * @type Function
     * @since 0.0.1
    */
    onSend: PropTypes.func,

    /**
     * The `onSuccess` function, transfer succeeded.
     *
     * @property onSuccess
     * @type Function
     * @since 0.0.1
    */
    onSuccess: PropTypes.func,

    /**
     * Additional params that can be send with the request.
     *
     * @property params
     * @type Object
     * @since 0.0.1
    */
    params: PropTypes.object,

    /**
     * Options to be passed through to the request.
     *
     * @property requestOptions
     * @type Object
     * @since 0.0.1
    */
    requestOptions: PropTypes.object,

    /**
     * Whether to show the progress inside the area.
     * Default: true
     *
     * @property showProgress
     * @type Boolean
     * @since 0.0.1
    */
    showProgress: PropTypes.bool,

    /**
     * Whether to show the `success`-feedback icon always when there are no errors.
     * This property overrules `props.markSuccess`.
     *
     * @property showSuccess
     * @type Boolean
     * @since 0.0.1
    */
    showSuccess: PropTypes.bool,

    /**
     * Inline style
     *
     * @property style
     * @type object
     * @since 0.0.1
    */
    style: PropTypes.object,

    /**
     * The tabindex of the Component.
     *
     * @property tabIndex
     * @type Number
     * @since 0.0.1
    */
    tabIndex: PropTypes.number,

    /**
     * The total maximum allowed file-size of all files altogether.
     *
     * @property totalFileSize
     * @type Number
     * @since 0.0.1
    */
    totalFileSize: PropTypes.number,

    /**
     * Whether the file can only be uploaded once. To reset, use `reactivate()`.
     *
     * @property uploadOnlyOnce
     * @type Boolean
     * @since 0.0.8
    */
    uploadOnlyOnce: PropTypes.bool,

    /**
     * The url to send to files to.
     *
     * @required
     * @property url
     * @type String
     * @since 0.0.1
    */
    url: PropTypes.string.isRequired,

    /**
     * Whether the selected files are is validated right. This value can be set inside the `onFileChange` callback.
     *
     * @property validated
     * @type Boolean
     * @since 0.0.1
    */
    validated: PropTypes.bool,

    /**
     * The width of the drop-area.
     *
     * @property width
     * @type String
     * @default "400px"
     * @since 17.0.2
    */
    width: PropTypes.string
};

Component.defaultProps = {
    autoFocus: false,
    autoSend: true,
    chunks: false,
    formSubmitMode: false,
    emptyAfterSent: true,
    height: "200px",
    markSuccess: true,
    markRequired: false,
    maxFileSize: DEF_MAX_SIZE,
    multipleFiles: false,
    showProgress: true,
    params: {},
    requestOptions: {},
    totalFileSize: DEF_MAX_SIZE,
    uploadOnlyOnce: false,
    width: "400px"
};

module.exports = Component;
