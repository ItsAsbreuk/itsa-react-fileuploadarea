"use strict";

/**
 * Description here
 *
 *
 *
 * <i>Copyright (c) 2016 ItsAsbreuk - http://itsasbreuk.nl</i><br>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 *
 * @module component.jsx
 * @class Component
 * @since 15.0.0
*/

const React = require("react"),
    PropTypes = React.PropTypes;

const Component = React.createClass({

    propTypes: {
        /**
         * The Component its children
         *
         * @property children
         * @type String || Object || Array
         * @since 15.0.0
        */

        children: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.array])
    },

    /**
     * React render-method --> renderes the Component.
     *
     * @method render
     * @return ReactComponent
     * @since 15.0.0
     */
    render() {
        return (
            <div />
        );
    }

});

module.exports = Component;
