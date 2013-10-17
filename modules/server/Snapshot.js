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
         * @property dimensions
         * @type {Object}
         */
        dimensions: {},

        /**
         * @property socket
         * @type {Object}
         */
        socket: null,

        /**
         * @property perPage
         * @type {Number}
         */
        perPage: 0,

        /**
         * @method initialise
         * @param socket {Object}
         * @return {void}
         */
        bootstrap: function setSocket(socket) {

            // Keep a reference to the socket for emitting purposes.
            this.socket = socket;

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
                this.dimensions[key] = this.crossfilter.dimension(function(model) {
                    return model[key];
                });

            }.bind(this));

            // Emit the `snapshot/contentUpdated` event because we've loaded
            // the collection into memory.
            this._emitContentUpdated();

        },

        /**
         * @method _emitContentUpdated
         * @emit snapshot/contentUpdated
         * Responsible for generating the content and firing the event to notify
         * the client of the current collection of models.
         * @private
         */
        _emitContentUpdated: function _emitContentUpdated() {

            var start   = new Date().getTime(),
                content = this.dimensions.id.filterAll().top(this.perPage);

            // Emits the event, passing the collection of models, and the time the
            // operation took the complete.
            this.socket.emit('snapshot/contentUpdated', {
                models          : content,
                responseTime    : (new Date().getTime() - start)
            });

        },

        /**
         * @method setPerPage
         * @emit snapshot/contentUpdated
         * @param value {Number}
         * @return {void}
         */
        setPerPage: function setPerPage(value) {
            this.perPage = value;
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