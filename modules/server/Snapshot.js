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
             * @on snapshot/sortBy
             */
            socket.on('snapshot/sortBy', function (data) {
                snapshot.setSortBy(data);
            });

        },

        /**
         * @method setCollection
         * @param collection {Array}
         * @return {void}
         */
        setCollection: function setCollection(collection) {

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
         * @emit snapshot/contentUpdated
         * @param value {Number}
         * @return {void}
         */
        setPerPage: function setPerPage(value) {

        },

        /**
         * @method setPageNumber
         * @emit snapshot/contentUpdated
         * @param value {Number}
         * @return {void}
         */
        setPageNumber: function setPageNumber(value) {

        },

        /**
         * @method setSortBy
         * @emit snapshot/contentUpdated
         * @param value {Number}
         * @return {void}
         */
        setSortBy: function setSortBy(value) {

        }

    };

    module.exports = new Snapshot();

})();