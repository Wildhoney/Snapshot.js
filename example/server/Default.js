var io          = require('socket.io').listen(8888),
    request     = require('request'),
    snapshot    = require('./../../modules/server/Snapshot.js');

/**
 * @on connection
 */
io.sockets.on('connection', function (socket) {

    // Bootstrap Snapshot passing in the reference for the socket as a dependency.
    snapshot.bootstrap(socket);

    // Configure the defaults.
    snapshot.setPerPage(10);
//    snapshot.setPageNumber(1);
//    snapshot.setSortBy('id');

    // URL to fetch the example JSON data from.
    var url = 'http://api.wordnik.com/v4/words.json/randomWords?hasDictionaryDef=false&minCorpusCount=0&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=5&maxLength=-1&limit=10000&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5';

    request(url, function (error, response, content) {

        if (!error && response.statusCode == 200) {

            // When the request is successful, pass the collection to Snapshot's `setData`
            // after parsing the JSON document.
            var json = JSON.parse(content);
            snapshot.setCollection(json);

        }

    });

    /**
     * @on changedStartCharacter
     * Updates the content when the `changedStartCharacter` event has been received.
     */
    socket.on('changedStartCharacter', function(data) {
        console.log(data);
    });

});