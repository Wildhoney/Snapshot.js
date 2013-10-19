(function() {

    "use strict";

    var crossfilter = require('crossfilter'),
        _           = require('underscore');

    /**
     * @module Snapshot
     * @param namespace {String}
     * @constructor
     */
    var Snapshot = function(namespace) {

        // Configure the namespace, with the default being "default".
        this.namespace = namespace || 'default';

    };

    /**
     * @property prototype
     * @type {Object}
     */
    Snapshot.prototype = {

        /**
         * @property namespace
         * @type {String}
         */
        namespace: '',

        /**
         * @property crossfilter
         * @type {Array}
         */
        crossfilter: null,

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
         * @property primaryKey
         * @type {String}
         */
        primaryKey: '',

        /**
         * @property memory
         * @type {Object}
         */
        memory: {},

        /**
         * @property delta
         * @type {Boolean}
         * Whether or not to provide delta updates to the connected clients.
         * In enabling delta updates, more work is required on the frontend to memorise which
         * models were already sent.
         */
        delta: false,

        /**
         * @property perPage
         * @type {Number}
         */
        perPage: 0,

        /**
         * @property pageNumber
         * @type {Number}
         */
        pageNumber: 0,

        /**
         * @property sorting
         * @type {Object}
         */
        sorting: {
            key         : '',
            direction   : 'ascending'
        },

        /**
         * @method bootstrap
         * @param socket {Object}
         * @return {Snapshot}
         */
        bootstrap: function bootstrap(socket) {

            // Keep a reference to the socket for emitting purposes.
            this.socket = socket;

            /**
             * @on snapshot/:namespace/perPage
             */
            socket.on(['snapshot', this.namespace, 'perPage'].join('/'), function (data) {
                this.setPerPage(data);
            }.bind(this));

            /**
             * @on snapshot/:namespace/pageNumber
             */
            socket.on(['snapshot', this.namespace, 'pageNumber'].join('/'), function (data) {
                this.setPageNumber(data);
            }.bind(this));

            /**
             * @on snapshot/:namespace/sortBy
             */
            socket.on(['snapshot', this.namespace, 'sortBy'].join('/'), function (data) {
                this.setSortBy(data);
            }.bind(this));

            return this;

        },

        /**
         * @method useDelta
         * @param status {Boolean}
         * Responsible for enabling or disabling delta updates where models that have already been
         * sent across the wire are not transmitted again -- instead, only their primary ID is transmitted.
         * @return {Snapshot}
         */
        useDelta: function useDelta(status) {
            this.delta = status;
            return this;
        },

        /**
         * @method setCollection
         * @param collection {Array}
         * @param primaryKey {String}
         * @return {void}
         */
        setCollection: function setCollection(collection, primaryKey) {

            this.crossfilter    = crossfilter(collection);
            var keys            = _.keys(collection[0]);
            this.primaryKey     = (primaryKey || keys[0]);

                _.forEach(keys, function(key) {

                // Iterate over each key found in the first model, and create a
                // dimension for it.
                this.dimensions[key] = this.crossfilter.dimension(function(model) {
                    return model[key];
                });

            }.bind(this));

            // Emit the `snapshot/:namespace/contentUpdated` event because we've loaded
            // the collection into memory.
            this._emitContentUpdated();

        },

        /**
         * @method _emitContentUpdated
         * @emit snapshot/:namespace/contentUpdated
         * Responsible for generating the content and firing the event to notify
         * the client of the current collection of models.
         * @private
         */
        _emitContentUpdated: function _emitContentUpdated() {

            if (!this.crossfilter) {
                // Don't attempt to fetch the content if we haven't loaded the
                // Crossfilter yet.
                return;
            }

            // Determine whether to use `top` or `bottom` depending on direction.
            var sortingMethod = 'top';
            if (_.contains(['ascending', 'ascend', 'asc'], this.sorting.direction)) {
                sortingMethod = 'bottom';
            }

            var start       = new Date().getTime(),
                content     = this.dimensions[this.sorting.key][sortingMethod](Infinity),
                totalModels = content.length,
                totalPages  = (totalModels / this.perPage < 0) ?
                              0 : Math.ceil(totalModels / this.perPage);

            if (this.perPage !== 0) {

                // Slice up the content according to the `pageNumber` and `perPage`.
                var pageNumber  = (this.pageNumber - 1);
                var offset      = (pageNumber * this.perPage);
                content         = content.slice(offset, this.perPage + offset);

            }

            // Determine if Snapshot has been kindly requested to send delta updates to reduce
            // the amount of bandwidth being transferred across the wire.
            if (this.delta) {

                // Pluck all of the primary keys from the current collection of models.
                var ids = _.pluck(content, this.primaryKey);

                // Iterate over each of the current collection of models, transforming them into
                // their primary key if they've been sent already.
                _.forEach(content, function(model, key) {

                    var primaryKey = model[this.primaryKey];

                    if (this.memory[primaryKey]) {
                        // Replace the full model with just its primary key if it's already been
                        // transferred to the client.
                        content[key] = primaryKey;
                    }

                }.bind(this));

                // Iterate over each of the plucked IDs, adding them to the memory object.
                _.forEach(ids, function(id) {
                    this.memory[id] = id;
                }.bind(this));

            }

            // Emits the event, passing the collection of models, and the time the
            // operation took to complete.
            this.socket.emit(['snapshot', this.namespace, 'contentUpdated'].join('/'), {
                models: content,
                stats: {
                    pages: {
                        total       : _.isNumber(totalPages) ? totalPages : 1,
                        current     : this.pageNumber,
                        perPage     : this.perPage || content.length
                    },
                    models: {
                        total       : totalModels,
                        current     : content.length
                    },
                    sort: {
                        key         : this.sorting.key,
                        direction   : this.sorting.direction
                    }
                },
                debug: {
                    responseTime: (new Date().getTime() - start)
                }
            });

        },

        /**
         * @method setPerPage
         * @emit snapshot/:namespace/contentUpdated
         * @param perPage {Number}
         * @return {void}
         */
        setPerPage: function setPerPage(perPage) {
            this.perPage = perPage;
            this._emitContentUpdated();
        },

        /**
         * @method setPageNumber
         * @emit snapshot/:namespace/contentUpdated
         * @param value {Number}
         * @return {void}
         */
        setPageNumber: function setPageNumber(pageNumber) {
            this.pageNumber = pageNumber;
            this._emitContentUpdated();
        },

        /**
         * @method setSortBy
         * @emit snapshot/:namespace/contentUpdated
         * @param options {Array}
         * @return {void}
         */
        setSortBy: function setSortBy(options) {

            /**
             * @method invertDirection
             * Responsible for inverting the current sort direction if it hasn't
             * been explicitly specified.
             * @return {void}
             */
            var invertDirection = function invertDirection() {
                return (this.sorting.direction === 'ascending') ? 'descending' : 'ascending';
            }.bind(this);

            this.sorting = {
                key         : options.key,
                direction   : options.direction || invertDirection()
            };

            this._emitContentUpdated();

        },

        /**
         * @method applyFilter
         * @param key {String}
         * @param filterMethod {Function}
         * @emit snapshot/:namespace/contentUpdated
         * Responsible for applying a filter on any given dimension by its key name.
         * @return {void}
         */
        applyFilter: function applyFilter(key, filterMethod) {

            var dimension = this.dimensions[key];
            this.clearFilter(key);
            filterMethod.call(this, dimension);
            this._emitContentUpdated();

        },

        /**
         * @method clearFilter
         * @param key {String}
         * @emit snapshot/:namespace/contentUpdated
         * Responsible for clearing a filter based on its key.
         * @return {void}
         */
        clearFilter: function clearFilter(key) {

            var dimension = this.dimensions[key];
            dimension.filterAll();
            this._emitContentUpdated();

        },

        /**
         * @method clearFilters
         * @emit snapshot/:namespace/contentUpdated
         * Responsible for clearing the filters of every single dimension.
         * @return {void}
         */
        clearFilters: function clearFilters() {
            _.forEach(this.dimensions, function(dimension) {
                dimension.filterAll();
            });
            this._emitContentUpdated();
        }

    };

    module.exports = Snapshot;

})();