(function($window) {

    /**
     * @module Snapshot
     * @constructor
     */
    var Snapshot = function() {

        this.socketIo = io.connect('http://localhost:8888');

    };

    /**
     * @property prototype
     * @type {Object}
     */
    Snapshot.prototype = {

        /**
         * @property socketIo
         * @type {Object}
         */
        socketIo: null

    };

    $window.snapshot = new Snapshot();

})(window);