(function($module) {

    "use strict";

    var crossfilter = require('crossfilter'),
        _           = require('underscore');
                      require('colors');

    /**
     * @module Snapshot
     * @param namespace {String}
     * @constructor
     */
    var Snapshot = function(namespace) {

        // Configure the namespace, with the default being "default".
        this.namespace      = namespace || 'default';

        // Reset items for each instantiation.
        this.crossfilter    = null;
        this.dimensions     = {};
        this.memory         = {};
        this.socket         = { emit: function() {
            this._printMessage('negative', 'You have not attached the socket.');
        }.bind(this)};

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
         * @property lastPageNumber
         * @type {Number}
         */
        lastPageNumber: 1,

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
        pageNumber: 1,

        /**
         * @property ranges
         * @type {Array}
         */
        ranges: [],

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
            socket.on(['snapshot', this.namespace, 'perPage'].join('/'), function (value) {
                this.setPerPage(value);
                this._emitContentUpdated();
            }.bind(this));

            /**
             * @on snapshot/:namespace/pageNumber
             */
            socket.on(['snapshot', this.namespace, 'pageNumber'].join('/'), function (value) {

                var hasChanged = this.setPageNumber(value);

                if (hasChanged) {
                    this._emitContentUpdated();
                }

            }.bind(this));

            /**
             * @on snapshot/:namespace/sortBy
             */
            socket.on(['snapshot', this.namespace, 'sortBy'].join('/'), function (key, direction) {
                this.setSortBy(key, direction);
                this._emitContentUpdated();
            }.bind(this));

            /**
             * @on snapshot/:namespace/exactFilter
             */
            socket.on(['snapshot', this.namespace, 'exactFilter'].join('/'), function (key, value) {

                this.applyFilter(key, function(dimension) {
                    dimension.filterExact(value);
                });

                this._emitContentUpdated();

            }.bind(this));

            /**
             * @on snapshot/:namespace/fuzzyFilter
             */
            socket.on(['snapshot', this.namespace, 'fuzzyFilter'].join('/'), function (key, value) {

                this.applyFilter(key, function(dimension) {

                    var regExp = new RegExp(value, 'i');
                    dimension.filterFunction(function(d) {
                        return d.match(regExp);
                    });

                });

                this._emitContentUpdated();

            }.bind(this));

            /**
             * @on snapshot/:namespace/rangeFilter
             */
            socket.on(['snapshot', this.namespace, 'rangeFilter'].join('/'), function (key, range) {

                this.applyFilter(key, function(dimension) {
                    dimension.filterRange(range);
                });

                this._emitContentUpdated();

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
         * @param suppressEmit {Boolean}
         * @return {void}
         */
        setCollection: function setCollection(collection, primaryKey, suppressEmit) {

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

            if (!suppressEmit) {
                // Emit the `snapshot/:namespace/contentUpdated` event because we've loaded
                // the collection into memory.
                this._emitContentUpdated();
            }

        },

        /**
         * @method setRanges
         * @param keys {Array}
         * Responsible for defining for which keys the ranges (min -> max) must be supplied.
         * @return {void}
         */
        setRanges: function setRanges(keys) {

            if (!_.isArray(keys)) {
                keys = [keys];
            }

            this.ranges = keys;

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
                content     = this.dimensions[this.sorting.key || this.primaryKey][sortingMethod](Infinity),
                totalModels = content.length,
                pageCount   = (totalModels / this.perPage < 0) ?
                              0 : Math.ceil(totalModels / this.perPage),
                totalPages  = Number.isFinite(pageCount) ? pageCount : 1;

            // Update `lastPageNumber` so that we can detect if any changes to `pageNumber` would
            // place the content out of range.
            this.lastPageNumber = totalPages;

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

            if (this.pageNumber > totalPages) {
                this.setPageNumber(totalPages);
                this._emitContentUpdated();
                return;
            }

            // Emits the event, passing the collection of models, and the time the
            // operation took to complete.
            this.socket.emit(['snapshot', this.namespace, 'contentUpdated'].join('/'), content, {
                pages: {
                    total       : totalPages,
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
                },
                ranges          : this.ranges ? this._getRanges() : [],
                responseTime    : (new Date().getTime() - start)
            });

        },

        /**
         * @method setPerPage
         * @emit snapshot/:namespace/contentUpdated
         * @param perPage {Number}
         * @return {void}
         */
        setPerPage: function setPerPage(perPage) {
            this.perPage = (perPage >= 0) ? perPage : 0;
        },

        /**
         * @method setPageNumber
         * @emit snapshot/:namespace/contentUpdated
         * @param pageNumber {Number}
         * @return {Boolean}
         */
        setPageNumber: function setPageNumber(pageNumber) {

            if (!this.crossfilter && pageNumber > 0) {
                // If we haven't set the Crossfilter yet then we'll allow the developer
                // to set the page number to whatever s/he wishes. Even if they set a ridiculous
                // number, Crossfilter will simply return the last valid page.
                this.pageNumber = pageNumber;
                return false;
            }

            // Return false if the change to the `pageNumber` would put us out of bounds.
            if (pageNumber <= 0 || pageNumber > this.lastPageNumber) {
                return false;
            }

            this.pageNumber = pageNumber;
            return true;

        },

        /**
         * @method setSortBy
         * @emit snapshot/:namespace/contentUpdated
         * @param key {String}
         * @param direction {String|Boolean}
         * @return {void}
         */
        setSortBy: function setSortBy(key, direction) {

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
                key         : key,
                direction   : direction || invertDirection()
            };

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

            if (!dimension) {
                this._printMessage('negative', 'Invalid column name found: "' + key + '".');
                return;
            }

            dimension.filterAll();
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

            if (!dimension) {
                this._printMessage('negative', 'Invalid column name found: "' + key + '".');
                return;
            }

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

        },

        /**
         * @method _printMessage
         * @param type {String}
         * @param message {String}
         * @private
         */
        _printMessage: function(type, message) {

            var title = '';

            switch (type) {
                case ('positive'): title  = '   ok    - '.green; break;
                case ('negative'): title  = '   error - '.red; break;
                case ('neutral'): title    = '   info  - '.cyan; break;
            }

            console.log(title + 'Snapshot.js - '.bold.grey + message.white);

        },

        /**
         * @method _getRanges
         * Retrieve the ranges for any items that need their min/max.
         * @return {Array}
         * @private
         */
        _getRanges: function _getRanges() {

            var ranges = {};

            _.forEach(this.ranges, function(key) {

                var dimension = this.dimensions[key];

                if (!dimension) {
                    return;
                }

                // Push the current bottom/top range into the array.
                ranges[key] = {
                    min: dimension.bottom(1)[0][key],
                    max: dimension.top(1)[0][key]
                };

            }.bind(this));

            return ranges;

        }

    };

    $module.exports = Snapshot;

})(module);