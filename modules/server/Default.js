var io          = require('socket.io').listen(8888),
    crossfilter = require('crossfilter'),
    snapshot    = require('./Snapshot.js');

/**
 * @on connection
 */
io.sockets.on('connection', function (socket) {

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

});