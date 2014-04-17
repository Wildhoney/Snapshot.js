(function($process) {

    "use strict";

    var express     = require('express'),
        app         = express(),
        server      = require('http').createServer(app),
        io          = require('socket.io').listen(server),
        fs          = require('fs'),
        Snapshot    = require('./../../modules/Snapshot.js');

    // Begin Express so the statistics are available from the `localPort`.
    app.use(express.static(__dirname + '/../client'));
    server.listen($process.env.PORT || 3001);

    /**
     * @on connection
     */
    io.sockets.on('connection', function (socket) {

        // Bootstrap Snapshot passing in the reference for the socket as a dependency.
        var $snapshot = new Snapshot('default').bootstrap(socket).useDelta(false);

        // Configure the defaults.
        $snapshot.setPerPage(10);
        $snapshot.setPageNumber(1);
        $snapshot.setPartition(20);
        $snapshot.setSortBy('word', 'ascending');
        $snapshot.setRanges(['id']);

        fs.readFile(__dirname + '/words.json', 'utf8', function(error, data) {

            // When the request is successful, pass the collection to Snapshot's `setCollection`
            // after parsing the JSON document.
            var json = JSON.parse(data);
            $snapshot.setCollection(json, ['id', 'word']);

        });

        /**
         * @on applyFilterByWord
         * @param text {String}
         * Updates the content when the `applyFilterByWord` event has been received.
         */
        socket.on('applyFilterByWord', function(text) {

            console.log('Text is: ' + text);

            $snapshot.applyFilter('word', function(wordDimension) {

                wordDimension.filterFunction(function(d) {
                    var regExp = new RegExp(text, 'i');
                    return d.match(regExp);
                });

            }, 'reduce');

        });

        /**
         * @on clearFilterByWord
         */
        socket.on('clearFilterByWord', function() {
            $snapshot.clearFilter('word');
        });

    });

})(process);