var should      = require('should'),
    Snapshot    = require('./../modules/Snapshot.js');

describe('Snapshot.js', function() {

    var $snapshot;

    describe('Basic', function() {

        beforeEach(function() {

            var socketMock = { on: function() {}, emit: function() {} };

            $snapshot = new Snapshot('default').bootstrap(socketMock).useDelta(false);
            $snapshot.setSortBy('name', 'ascending');
            $snapshot.setCollection([
                { id: 1, name: 'Adam', country: 'United Kingdom' },
                { id: 2, name: 'Masha',country: 'Russian Federation' },
                { id: 3, name: 'Karl', country: 'United Kingdom' },
                { id: 4, name: 'Brian', country: 'United Kingdom' },
                { id: 5, name: 'Simon', country: 'United Kingdom' },
                { id: 6, name: 'Artem', country: 'Ukraine' }
            ], null, 'id', true, true);

        });

        it('Should assume a default namespace if not specified', function() {
            $snapshot = new Snapshot();
            $snapshot.namespace.should.equal('default');
        });

        it('Should take the namespace name if specified', function() {
            $snapshot = new Snapshot('myNamespace');
            $snapshot.namespace.should.equal('myNamespace');
        });

        it('Should store a reference to the WebSocket object', function() {
            $snapshot.socket.should.be.an.instanceOf(Object);
        });

        it('Should take the collection of models and store them in Crossfilter', function() {
            $snapshot.crossfilter.should.be.an.instanceOf(Object);
            $snapshot.dimensions.id.should.be.an.instanceOf(Object);
            $snapshot.dimensions.name.should.be.an.instanceOf(Object);
            $snapshot.dimensions.name.top(Infinity).should.be.an.instanceOf(Array).with.a.lengthOf(6);
        });

        it('Should set the page number, per page, and sort attributes', function() {

            $snapshot.setPerPage(2);
            $snapshot.perPage.should.equal(2);

            $snapshot.lastPageNumber = 3;
            var hasChanged = $snapshot.setPageNumber(3);
            $snapshot.pageNumber.should.equal(3);
            hasChanged.should.equal(true);

            $snapshot.setSortBy('name', false);
            $snapshot.sorting.key.should.equal('name');
            $snapshot.sorting.direction.should.equal('descending');

            $snapshot.setSortBy('id', 'descending');
            $snapshot.sorting.key.should.equal('id');
            $snapshot.sorting.direction.should.equal('descending');

        });

        it('Should not set the page number when it is out of range', function() {

            $snapshot.lastPageNumber = 2;
            var hasChanged = $snapshot.setPageNumber(3);
            $snapshot.pageNumber.should.equal(1);
            hasChanged.should.equal(false);

        });

        it('Should filter the collection by the name', function() {

            $snapshot.applyFilter('name', function(dimension) {

                var socketMock = { on: function() {}, emit: function(name, models) {
                    models.should.be.an.instanceOf(Object).with.lengthOf(1);
                    models[0].name.should.equal('Adam');
                }};

                dimension.filterExact('Adam');
                $snapshot.bootstrap(socketMock);

            });

            var socketMock = { on: function() {}, emit: function(name, models) {
                models.should.be.an.instanceOf(Object).with.lengthOf(6);
                models[3].name.should.equal('Karl');
            }};

            $snapshot.bootstrap(socketMock);
            $snapshot.clearFilter('name');

        });

    });

    describe('WebSockets', function() {

        var $snapshot, ioServer = require('socket.io').listen(8889, { log: false });
        var ioClient = require('socket.io-client');

        beforeEach(function(done) {

            ioServer.sockets.on('connection', function (socket) {

                $snapshot = new Snapshot('default').bootstrap(socket).useDelta(false);
                $snapshot.setSortBy('name', 'ascending');
                $snapshot.setCollection([
                    { id: 1, name: 'Adam', country: 'United Kingdom' },
                    { id: 2, name: 'Masha',country: 'Russian Federation' },
                    { id: 3, name: 'Karl', country: 'United Kingdom' },
                    { id: 4, name: 'Brian', country: 'United Kingdom' },
                    { id: 5, name: 'Simon', country: 'United Kingdom' },
                    { id: 6, name: 'Artem', country: 'Ukraine' }
                ], null, 'id', true, true);

            });

            done();

        });

        describe('Events', function() {

            var $client;

            beforeEach(function(done) {

                $client = ioClient.connect('http://0.0.0.0:8889', {
                    transports: ['websocket'],
                    'force new connection': true
                });

                $client.on('connect', function() {
                    done();
                })

            });

            describe('Paging', function() {

                it('Should change the models per page on event', function() {
                    $client.emit('snapshot/default/perPage', 3);
                    $client.on('snapshot/default/contentUpdated', function(models) {
                        $snapshot.perPage.should.equal(3);
                        models.should.have.lengthOf(3);
                    });
                });

                it('Should change the page number on event', function() {
                    $client.emit('snapshot/default/pageNumber', 1);
                    $client.on('snapshot/default/contentUpdated', function(models) {
                        $snapshot.pageNumber.should.equal(1);
                        models.should.have.lengthOf(6);
                    });
                });

                it('Should change the sorting order on event', function() {
                    $client.emit('snapshot/default/sortBy', 'name', 'descending');
                    $client.on('snapshot/default/contentUpdated', function(models) {
                        models.should.have.lengthOf(6);
                        models[0].name.should.equal('Simon');
                    });
                });

                it('Should store the IDs for those already sent', function() {
                    $snapshot.memory['1'] = 1;
                    $client.on('snapshot/default/contentUpdated', function(models) {
                        $snapshot.memory.should.be.instanceOf(Object);
                        $snapshot.memory.should.have.property('3');
                        models[0].should.equal('1');
                    });
                });

                it('Should provide delta models for those already sent', function() {
                    $snapshot.useDelta(true);
                    $snapshot.delta.should.equal(true);

                    $client.emit('snapshot/default/pageNumber', 1);
                    $client.on('snapshot/default/contentUpdated', function(models) {
                        $snapshot.memory.should.be.instanceOf(Object);
                        $snapshot.memory.should.have.property('3');
                        models[0].name.should.equal('Adam');
                    });
                });

            });

            describe('Filtering', function() {

                it('Should filter the collection by name exactly', function() {
                    $client.emit('snapshot/default/exactFilter', 'name', 'Adam');
                    $client.on('snapshot/default/contentUpdated', function(models) {
                        models.should.have.lengthOf(1);
                        models[0].name.should.equal('Adam');
                    });
                });

                it('Should filter the collection by values in array', function() {
                    $client.emit('snapshot/default/inArrayFilter', 'country', ['Ukraine']);
                    $client.on('snapshot/default/contentUpdated', function(models) {
                        models.should.have.lengthOf(1);
                        models[0].name.should.equal('Artem');
                    });
                });

                it('Should filter the collection by values not in array', function() {
                    $client.emit('snapshot/default/notInArrayFilter', 'country', ['United Kingdom']);
                    $client.on('snapshot/default/contentUpdated', function(models) {
                        models.should.have.lengthOf(2);
                        models[0].name.should.equal('Artem');
                    });
                });

                it('Should filter the collection by name fuzzily', function() {
                    $client.emit('snapshot/default/fuzzyFilter', 'name', 'A');
                    $client.on('snapshot/default/contentUpdated', function(models) {
                        models.should.have.lengthOf(5);
                        models[0].name.should.equal('Adam');
                        models[1].name.should.equal('Artem');
                        models[2].name.should.equal('Brian');
                        models[3].name.should.equal('Karl');
                        models[4].name.should.equal('Masha');
                    });
                });

                it('Should filter the collection by ID range', function() {
                    $client.emit('snapshot/default/rangeFilter', 'id', [2,4]);
                    $client.on('snapshot/default/contentUpdated', function(models) {
                        models.should.have.lengthOf(2);
                        models[0].id.should.equal(3);
                        models[1].id.should.equal(2);
                    });
                });

            });

        });

    });

});