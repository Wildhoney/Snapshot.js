(function($app) {

    "use strict";

    /**
     * @module App
     * @controller IndexController
     */
    $app.controller('IndexController', function IndexController($scope) {

        /**
         * @property collection
         * @type {Array}
         */
        $scope.collection = [];

        // Establish a connection to the Node.js server.
        var socket = io.connect('http://localhost:8888');

        /**
         * @on snapshot/contentUpdated
         */
        socket.on('snapshot/contentUpdated', function(data) {

            $scope.$apply(function() {
                $scope.collection = data.models;
            });

        });

    });

})(window.app);