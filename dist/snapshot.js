(function($module, $process, $console) {

    "use strict";

    try {

        var crossfilter = require('crossfilter'),
            _           = require('underscore');

    } catch (e) {

        // We couldn't load Crossfilter and/or Underscore.
        $console.error('Cannot load dependencies. Please ensure you ran `npm install`.');

    }

    /**
     * @module Snapshot
     * @param namespace {String}
     * @constructor
     */
    var Snapshot = function(namespace) {

        // Configure the namespace, with the default being "default".
        this.namespace = namespace || 'default';

        // Reset items for each instantiation.
        this.crossfilter = null;
        this.dimensions = {};
        this.memory = {};
        this.socket = { emit: function() {
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
        namespace: null,

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
         * @property partition
         * @type {Number}
         */
        partition: 0,

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
         * @property allowEmit
         * @type {Boolean}
         * @default true
         */
        allowEmit: true,

        /**
         * @property memory
         * @type {Object}
         */
        memory: {},

        /**
         * @property modelCount
         * @type {Number}
         * @default 0
         */
        modelCount: 0,

        /**
         * @property lastPageNumber
         * @type {Number}
         */
        lastPageNumber: 1,

        /**
         * Whether or not to provide delta updates to the connected clients.
         * In enabling delta updates, more work is required on the frontend to memorise which
         * models were already sent.
         *
         * @property delta
         * @type {Boolean}
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
         * @property groups
         * @type {Array}
         */
        groups: [],

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
            key: '',
            direction: 'ascending'
        },

        /**
         * @method bootstrap
         * @param socket {Object}
         * @return {Snapshot}
         */
        bootstrap: function bootstrap(socket) {

            // Keep a reference to the socket for emitting purposes.
            this.socket = socket;

            // For the internal garbage collection. Although it's recommended to nullify the instance
            // of Snapshot on disconnect, too.
            socket.on('disconnect', _.bind(function disconnect() {

                for (var item in this) {

                    // Nullify items that aren't functions and belong directly to this object.
                    if (this.hasOwnProperty(item) && typeof this[item] !== 'function') {
                        this[item] = undefined;
                    }

                }

            }, this));

            /**
             * @event snapshot/:namespace/perPage
             */
            socket.on(['snapshot', this.namespace, 'perPage'].join('/'), function (value) {
                this.setPerPage(value);
                this._emitContentUpdated();
            }.bind(this));

            /**
             * @event snapshot/:namespace/pageNumber
             */
            socket.on(['snapshot', this.namespace, 'pageNumber'].join('/'), function (value) {

                var hasChanged = this.setPageNumber(value);

                if (hasChanged) {
                    this._emitContentUpdated();
                }

            }.bind(this));

            /**
             * @event snapshot/:namespace/sortBy
             */
            socket.on(['snapshot', this.namespace, 'sortBy'].join('/'), function (key, direction) {
                this.setSortBy(key, direction);
                this._emitContentUpdated();
            }.bind(this));

            /**
             * @event snapshot/:namespace/clearFilter
             */
            socket.on(['snapshot', this.namespace, 'clearFilter'].join('/'), function (key) {
                this.clearFilter(key);
                this._emitContentUpdated();
            }.bind(this));

            /**
             * @event snapshot/:namespace/inArrayFilter
             */
            socket.on(['snapshot', this.namespace, 'inArrayFilter'].join('/'), function (key, array) {

                this.applyFilter(key, function(dimension) {
                    dimension.filterFunction(function(d) {
                        return _.contains(array, d);
                    });
                });

                this._emitContentUpdated();

            }.bind(this));

            /**
             * @event snapshot/:namespace/notInArrayFilter
             */
            socket.on(['snapshot', this.namespace, 'notInArrayFilter'].join('/'), function (key, array) {

                this.applyFilter(key, function(dimension) {
                    dimension.filterFunction(function(d) {
                        return !_.contains(array, d);
                    });
                });

                this._emitContentUpdated();

            }.bind(this));

            /**
             * @event snapshot/:namespace/exactFilter
             */
            socket.on(['snapshot', this.namespace, 'exactFilter'].join('/'), function (key, value) {

                this.applyFilter(key, function(dimension) {
                    dimension.filterExact(value);
                });

                this._emitContentUpdated();

            }.bind(this));

            /**
             * @event snapshot/:namespace/fuzzyFilter
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
             * @event snapshot/:namespace/regExpFilter
             */
            socket.on(['snapshot', this.namespace, 'regExpFilter'].join('/'), function (key, regExp, flags) {

                var expression = ['/', regExp, '/'].join('');

                this.applyFilter(key, function(dimension) {

                    var regExp = new RegExp(expression, flags);
                    dimension.filterFunction(function(d) {
                        return d.match(regExp);
                    });

                });

                this._emitContentUpdated();

            }.bind(this));

            /**
             * @event snapshot/:namespace/rangeFilter
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
         * Responsible for enabling or disabling delta updates where models that have already been
         * sent across the wire are not transmitted again -- instead, only their primary ID is transmitted.
         *
         * @method useDelta
         * @param status {Boolean}
         * @return {Snapshot}
         */
        useDelta: function useDelta(status) {
            this.delta = !!status;
            return this;
        },

        /**
         * @method pauseEmit
         * @return {void}
         */
        pauseEmit: function pauseEmit() {
            this.allowEmit = false;
        },

        /**
         * @method resumeEmit
         * @param emitContentUpdatedEvent {Boolean}
         * @return {void}
         */
        resumeEmit: function resumeEmit(emitContentUpdatedEvent) {

            this.allowEmit = true;

            if (emitContentUpdatedEvent) {
                this._emitContentUpdated();
            }

        },

        /**
         * @method setCollection
         * @param collection {Array}
         * @param keys {Array}
         * @param primaryKey {String}
         * @param suppressEmit {Boolean}
         * @param disableTicks {Boolean}
         * @return {void}
         */
        setCollection: function setCollection(collection, keys, primaryKey, suppressEmit, disableTicks) {

            var time          = new Date().getTime();
            this.crossfilter  = crossfilter(collection);
            this.modelCount   = collection.length;
            keys              = keys || _.keys(collection[0]);
            this.primaryKey   = (primaryKey || keys[0]);

            _.forEach(keys, function(key) {

                var createDimension = _.bind(function createDimension() {

                    // Iterate over each key found in the first model, and create a
                    // dimension for it.
                    this.dimensions[key] = this.crossfilter.dimension(function(model) {
                        return model[key];
                    });

                }, this);

                if (disableTicks) {
                    createDimension();
                    return;
                }

                $process.nextTick(createDimension);

            }.bind(this));

            if (!suppressEmit) {

                var emit = _.bind(function emit() {

                    // Emit the `snapshot/:namespace/contentUpdated` event because we've loaded
                    // the collection into memory.
                    this._emitContentUpdated(time);

                }, this);

                if (disableTicks) {
                    emit();
                    return;
                }

                $process.nextTick(emit);

            }

        },

        /**
         * @method setPerPage
         * @broadcast snapshot/:namespace/contentUpdated
         * @param perPage {Number}
         * @return {void}
         */
        setPerPage: function setPerPage(perPage) {
            this.perPage = (perPage >= 0) ? perPage : 0;
        },

        /**
         * @method setPageNumber
         * @broadcast snapshot/:namespace/contentUpdated
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
         * @broadcast snapshot/:namespace/contentUpdated
         * @param key {String}
         * @param direction {String|Boolean}
         * @return {void}
         */
        setSortBy: function setSortBy(key, direction) {

            /**
             * Responsible for inverting the current sort direction if it hasn't
             * been explicitly specified.
             *
             * @method invertDirection
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
         * @method setGroups
         * @param keys {Array}
         * @return {void}
         */
        setGroups: function setGroups(keys) {

            if (!_.isArray(keys)) {
                keys = [keys];
            }

            this.groups = keys;

        },

        /**
         * @method setPartition
         * @param limit {Number}
         * @return {void}
         */
        setPartition: function setPartition(limit) {
            this.partition = limit;
        },

        /**
         * Responsible for defining for which keys the ranges (min -> max) must be supplied.
         *
         * @method setRanges
         * @param keys {Array}
         * @return {void}
         */
        setRanges: function setRanges(keys) {

            if (!_.isArray(keys)) {
                keys = [keys];
            }

            this.ranges = keys;

        },

        /**
         * Responsible for applying a filter on any given dimension by its key name.
         *
         * @method applyFilter
         * @param key {String}
         * @param filterMethod {Function}
         * @param [filterType="afresh"] {String}
         * @broadcast snapshot/:namespace/contentUpdated
         * @return {void}
         */
        applyFilter: function applyFilter(key, filterMethod, filterType) {

            // Set a default for the `filterType` if one hasn't been specified.
            filterType = filterType || 'afresh';

            var supportedTypes  = ['afresh', 'reduce'],
                dimensions      = [];

            if (!_.contains(supportedTypes, filterType)) {

                // Determine if the current filtering type is supported.
                this._printMessage('negative', 'Unsupported filter method: ' + filterType + '. Defaulting to "default"');
                filterType = 'afresh';

            }

            // Convert the `key` into an array so that single filters can be dealt
            // with in the same way as composite filters.
            key = (_.isArray(key)) ? key : [key];


            // Iterate over each key.
            _.forEach(key, _.bind(function forEach(key) {

                var dimension = this.dimensions[key];

                if (!dimension) {
                    this._printMessage('negative', 'Invalid column name found: "' + key + '".');
                    return;
                }

                if (filterType === 'afresh') {

                    // Clear the current filter if we've set "default".
                    dimension.filterAll();

                }

                dimensions.push(dimension);

            }, this));

            filterMethod.apply(this, dimensions);
            this._emitContentUpdated();

        },

        /**
         * Responsible for clearing a filter based on its key.
         *
         * @method clearFilter
         * @param key {String}
         * @broadcast snapshot/:namespace/contentUpdated
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
         * Responsible for clearing the filters of every single dimension.
         * 
         * @method clearFilters
         * @broadcast snapshot/:namespace/contentUpdated
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
         * @return {void}
         * @private
         */
        _printMessage: function(type, message) {

            var title = '';

            switch (type) {
                case ('positive'): title  = '   ok    - '.green; break;
                case ('negative'): title  = '   error - '.red; break;
                case ('neutral'): title    = '   info  - '.cyan; break;
            }

            $console.log(title + 'Snapshot.js - '.bold.grey + message.white);

        },

        /**
         * @method _getSortMethod
         * @return {String}
         * @private
         */
        _getSortMethod: function _getSortMethod() {
            if (_.contains(['ascending', 'ascend', 'asc'], this.sorting.direction)) {
                return 'bottom';
            }

            return 'top';
        },

        /**
         * @method _slice
         * @param collection {Array}
         * @return {Array}
         * @private
         */
        _slice: function _slice(collection) {

            if (!isFinite(this.perPage)) {

                // If the developer has chosen to set "Infinity" for the per page, then we'll limit
                // that to the collection's total length.
                this.perPage = this.modelCount;

            }

            // Slice up the content according to the `pageNumber` and `perPage`.
            var pageNumber  = (this.pageNumber - 1);
            var offset      = (pageNumber * this.perPage);
            return collection.slice(offset, this.perPage + offset);

        },

        /**
         * @method collection
         * @param collection {Array}
         * @return {Array}
         * @private
         */
        _delta: function _delta(collection) {

            // Pluck all of the primary keys from the current collection of models.
            var ids = _.pluck(collection, this.primaryKey);

            // Iterate over each of the current collection of models, transforming them into
            // their primary key if they've been sent already.
            _.forEach(collection, function(model, key) {

                var primaryKey = model[this.primaryKey];

                if (this.memory[primaryKey]) {
                    // Replace the full model with just its primary key if it's already been
                    // transferred to the client.
                    collection[key] = primaryKey;
                }

            }.bind(this));

            // Iterate over each of the plucked IDs, adding them to the memory object.
            _.forEach(ids, function(id) {
                this.memory[id] = id;
            }.bind(this));

            return collection;

        },

        /**
         * Responsible for generating the content and firing the event to notify
         * the client of the current collection of models.
         *
         * @method _emitContentUpdated
         * @param time {Number}
         * @broadcast snapshot/:namespace/contentUpdated
         * @return {void}
         * @private
         */
        _emitContentUpdated: function _emitContentUpdated(time) {

            if (!this.crossfilter || !this.allowEmit) {
                // Don't attempt to fetch the content if we haven't loaded the
                // Crossfilter yet.
                return;
            }

            // Determine whether to use `top` or `bottom` depending on direction.
            var sortingMethod = this._getSortMethod();

            var start       = time || new Date().getTime(),
                content     = this.dimensions[this.sorting.key || this.primaryKey][sortingMethod](Infinity),
                modelCount  = content.length,
                pageCount   = this.lastPageNumber = Math.ceil((modelCount / this.perPage)) || 1;

            // Only slice up the content if we're not displaying everything on one page.
            if (this.perPage !== 0) {
                content = this._slice(content);
            }

            // Determine if Snapshot has been kindly requested to send delta updates to reduce
            // the amount of bandwidth being transferred across the wire.
            if (this.delta) {
                content = this._delta(content);
            }

            if (this.pageNumber > pageCount) {

                // Invoke own method if the page number is more than the total amount of pages, setting the
                // actual page number to the total pages.
                this.setPageNumber(pageCount);
                this._emitContentUpdated();
                return;

            }

            // Compose the object for the statistics.
            var statistics = {
                pages: {
                    total       : pageCount,
                    current     : this.pageNumber,
                    perPage     : this.perPage || content.length
                },
                models: {
                    total       : modelCount,
                    current     : content.length
                },
                sort: {
                    key         : this.sorting.key,
                    direction   : this.sorting.direction
                },
                ranges          : this._getRanges(),
                groups          : this._getGroups(),
                responseTime    : (new Date().getTime() - start)
            };

            // Emit the entire collection with the statistics.
            this.socket.emit(['snapshot', this.namespace, 'contentUpdated'].join('/'), content, statistics);

        },

        /**
         * @method _getGroups
         * @return {Object}
         * @private
         */
        _getGroups: function _getGroups() {

            var groups = {};

            // Iterate over each desired key.
            _.forEach(this.groups, _.bind(function forEach(key) {

                // Voila!
                var group = this.dimensions[key].group(function group(d) {
                    return d;
                });

                groups[key] = group.all();

            }, this));

            return groups;

        },

        /**
         * Retrieve the ranges for any items that need their min/max.
         * 
         * @method _getRanges
         * @return {Array}
         * @private
         */
        _getRanges: function _getRanges() {

            if (!this.ranges) {
                return [];
            }

            var ranges = {};

            _.forEach(this.ranges, function(key) {

                var dimension = this.dimensions[key];

                if (!dimension) {
                    return;
                }

                var min = dimension.bottom(1)[0],
                    max = dimension.top(1)[0];

                if (!min || !max) {
                    ranges[key] = { min: -Infinity, max: Infinity };
                    return
                }

                // Push the current bottom/top range into the array.
                ranges[key] = { min: min[key], max: max[key] };

            }.bind(this));

            return ranges;

        }

    };

    $module.exports = Snapshot;

})(module, process, console);
