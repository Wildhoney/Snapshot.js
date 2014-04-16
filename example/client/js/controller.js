(function($app) {

    "use strict";

    /**
     * @module App
     * @controller IndexController
     */
    $app.controller('IndexController', function IndexController($scope, ENV) {

        /**
         * @property collection
         * @type {Array}
         */
        $scope.collection = [];

        /**
         * @property stats
         * @type {Object}
         */
        $scope.stats = {};

        /**
         * @property filter
         * @type {String}
         */
        $scope.filter = '';

        // Establish a connection to the Node.js server.
        var socket = io.connect(ENV.socketEndpoint);

        /**
         * @on snapshot/default/contentUpdated
         */
        socket.on('snapshot/default/contentUpdated', function(models, stats) {

            $scope.$apply(function() {
                $scope.collection   = models;
                $scope.stats        = stats;
            });

        });

        /**
         * @method nextPage
         * @return {void}
         */
        $scope.nextPage = function nextPage() {
            var nextPageNumber = $scope.stats.pages.current + 1;
            socket.emit('snapshot/default/pageNumber', nextPageNumber);
        };

        /**
         * @method previousPage
         * @return {void}
         */
        $scope.previousPage = function previousPage() {
            var previousPageNumber = $scope.stats.pages.current - 1;
            socket.emit('snapshot/default/pageNumber', previousPageNumber);
        };

        /**
         * @method perPage
         * @param amount {Number}
         * @return {void}
         */
        $scope.perPage = function perPage(amount) {
            socket.emit('snapshot/default/perPage', amount);
        };

        /**
         * @method sortBy
         * @param property {String}
         * @return {void}
         */
        $scope.sortBy = function sortBy(property) {
            socket.emit('snapshot/default/sortBy', property, false);
        };

        /**
         * @method applyFilter
         * @param text {String|Number}
         * @return {void}
         */
        $scope.applyFilter = function applyFilter(text) {
            socket.emit('applyFilterByWord', text);
        };

        /**
         * @method clearFilter
         * @return {void}
         */
        $scope.clearFilter = function clearFilter() {
            socket.emit('clearFilterByWord');
            $scope.filter = '';
        };

    });

})(window.app);