(function($window) {

    /**
     * @module Snapshot
     * @constructor
     */
    var Snapshot = function() {

        this.socket = io.connect('http://localhost:8888');

        /**
         * @on contentUpdated
         */
        this.socket.on('contentUpdated', function contentUpdated(models) {

            var section = $window.document.querySelector('section.content');
            section.innerHTML(models);

        });

    };

    /**
     * @property prototype
     * @type {Object}
     */
    Snapshot.prototype = {

        /**
         * @property socket
         * @type {Object}
         */
        socket: null

    };

    $window.snapshot = new Snapshot();

})(window);