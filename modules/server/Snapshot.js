(function() {

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
         * @property collection
         * @type {Array}
         */
        collection: [],

        /**
         * @method initialise
         * @param socket {Object}
         * @return {void}
         */
        initialise: function setSocket(socket) {

            /**
             * @on perPage
             * @emit contentUpdated
             */
            socket.on('perPage', function (data) {
                snapshot.setPerPage(data);
                socket.emit('contentUpdated', snapshot.getContent());
            });

            /**
             * @on pageNumber
             * @emit contentUpdated
             */
            socket.on('pageNumber', function (data) {
                snapshot.setPageNumber(data);
                socket.emit('contentUpdated', snapshot.getContent());
            });

        },

        /**
         * @method setData
         * @param collection {Array}
         * @return {void}
         */
        setData: function setData(collection) {
            this.collection = collection;
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

        }

    };

    module.exports = new Snapshot();

})();