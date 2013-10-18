Snapshot.js
===========

Node.js app for slicing and dicing paginated chunks of data with easy sorting and filtering.

Dependencies
-----------

All dependencies can be installed with `bower install` and `npm install`, however the list is as follows:

 * <a href="http://socket.io/">Socket.IO</a> (client and server);
 * <a href="http://underscorejs.org/">Underscore.js</a> (server);
 * <a href="http://nodejs.org/">Node.js</a> (server);
 * <a href="http://square.github.io/crossfilter/">Crossfilter</a> (server);
 * <a href="http://pivotal.github.io/jasmine/">Jasmine</a> (grunt);

Quick Start
-----------

Once a WebSocket connection has been successfully established, you're able to bootstrap Snapshot, passing in the WebSocket (Socket.IO) reference as a dependency.

```javascript
snapshot.bootstrap(socket);
```

You then need to tell Snapshot what collection it's going to be creating snapshots of.

```javascript
snapshot.setCollection(collection, primaryKey);
```

Snapshot listens for three events natively, and these are handled automatically.

 * `snapshot/perPage` &ndash; Set amount per page;
 * `snapshot/pageNumber` &ndash; Set current page number;
 * `snapshot/sortBy` &ndash; Set order column and ascending/descending;

When the collection has been updated, Snapshot emits the `snapshot/contentUpdated` event, passing through the snapshot as the first argument.

For sorting by any given column, you can emit the `snapshot/sortBy` event with a simple hash. If you omit the `direction` property (or set its value to `false`) then Snapshot will cleverly invert the current sorting direction for you.

```javascript
socket.emit('snapshot/sortBy', {
    key         : property,
    direction   : 'descending'
});
```

Filtering
-----------

In addition to sorting and limiting, Snapshot also allows for the filtering of the collection. For this you can use the `applyFilter` filter method. Unfortunately you will need to read <a href="https://github.com/square/crossfilter/wiki/API-Reference" target="_blank">Crossfilter's API Reference</a> before you begin filtering.

```javascript
socket.emit('filterByWord', text);
```

You can apply a filter however you like. It doesn't necessarily need to be applied via WebSockets, you could just as well use vanilla Node.js or Express.js. In our example though, we emit the `filterByWord` event to the Node.js server, and then we need to listen for that event.

```javascript
socket.on('filterByWord', function(text) {

    snapshot.applyFilter('word', function(dimension) {

        dimension.filterFunction(function(d) {
            var regExp = new RegExp(text, 'i');
            return d.match(regExp);
        });

    });

});
```

You essentially invoke the `applyFilter` on the `snapshot` object. Snapshot will pass in the `dimension` argument to your lambda function &ndash; `this` context is preserved. It's then entirely up to you to apply that dimension to the collection.

If you would like to clear a specific dimension, then you can use the `clearFilter` method &ndash; which takes the property name as its one and only argument.

```javascript
snapshot.clearFilter('word');
```

You can also clear every single filter by using the `clearFilters` method.

```javascript
snapshot.clearFilters();
```

Architecture
-----------

Below is a simple diagram of how Snapshot works. It demonstrates how the `snapshot/pageNumber` event operates &ndash; which is also the same way other native Snapshot events function. It also demonstrates the flow of custom filters.

<img src="http://oi42.tinypic.com/v33vb9.jpg alt="Snapshot Architecture" />

 * Browser establishes a WebSocket connection to Node.js &ndash; models are added;
 * Browser emits `snapshot/pageNumber` event with data (example);
 * Snapshot along with Crossfilter updates the collection <i>snapshot</i>;
 * Snapshot emits `snapshot/contentUpdated` event with the updated collection;
 * Browser emits a custom event (`customFilterApplied`) with the data;
 * Node.js listens for the `customFilterApplied` event and then interacts with Snapshot;
 * Snapshot emits the `snapshot/contentUpdated` event with the updated filter applied;

Angular
-----------

Snapshot also comes with a bundled Angular module for easier interaction. Simply add `$snapshot` as a dependency and you have everything you need.