var io          = require('socket.io').listen(8888),
    crossfilter = require('crossfilter'),
    q           = require('q'),
    request     = require('request'),
    snapshot    = require('./Snapshot.js');

/**
 * @on connection
 */
io.sockets.on('connection', function (socket) {

//    snapshot.bootstrap(socket);

    (function() {

        var url = 'http://api.wordnik.com/v4/words.json/randomWords?hasDictionaryDef=false&minCorpusCount=0&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=5&maxLength=-1&limit=10000&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5';

        request(url, function (error, response, content) {

            if (!error && response.statusCode == 200) {
                snapshot.setData(content);
            }

        })

    })();


});