var io          = require('socket.io').listen(8888),
    fs          = require('fs'),
    Snapshot    = require('./../../modules/Snapshot.js');

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

    fs.readFile('words.json', 'utf8', function(error, data) {

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