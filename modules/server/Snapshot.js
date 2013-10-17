(function() {

    "use strict";

    var crossfilter = require('crossfilter'),
        _           = require('underscore');

    /**
     * @module Snapshot
     * @constructor
     */
    var Snapshot = function() {};

    /**
     * @property prototype
     * @type {Object}
     */
    Snapshot.prototype = {

        /**
         * @property crossfilter
         * @type {Array}
         */
        crossfilter: [],

        /**
         * @method initialise
         * @param socket {Object}
         * @return {void}
         */
        bootstrap: function setSocket(socket) {

            /**
             * @on snapshot/perPage
             */
            socket.on('snapshot/perPage', function (data) {
                snapshot.setPerPage(data);
            });

            /**
             * @on snapshot/pageNumber
             */
            socket.on('snapshot/pageNumber', function (data) {
                snapshot.setPageNumber(data);
            });

            /**
             * @on snapshot/limit
             */
            socket.on('snapshot/limit', function (data) {
                snapshot.setLimit(data);
            });

        },

        /**
         * @method setData
         * @param collection {Array}
         * @return {void}
         */
        setData: function setData(collection) {

            this.crossfilter    = crossfilter(collection);
            var keys            = _.keys(collection[0]);

            _.forEach(keys, function(key) {

                // Iterate over each key found in the first model, and create a
                // dimension for it.
                this.crossfilter.dimension(function(model) {
                    return model[key];
                });

            }.bind(this));

        },

        /**
         * @method setPerPage
         * @param value {Number}
         * @return {void}
         */
        setPerPage: function setPerPage(value) {

        },

        /**
         * @method setPageNumber
         * @param value {Number}
         * @return {void}
         */
        setPageNumber: function setPageNumber(value) {

        },

        /**
         * @method setLimit
         * @param value {Number}
         * @return {void}
         */
        setLimit: function setLimit(value) {

        }

    };

    module.exports = new Snapshot();

})();