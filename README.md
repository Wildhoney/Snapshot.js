Snapshot.js
===========

Node.js app for slicing and dicing paginated chunks of data with easy sorting and filtering.

<img src="https://travis-ci.org/Wildhoney/Snapshot.js.png?branch=master" alt="Travis CI" />

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
var $snapshot = new Snapshot().bootstrap(socket).useDelta(false);
```

You then need to tell Snapshot what collection it's going to be creating snapshots of. You can pass in an optional string for the `primaryKey` &ndash; if you omit the `primaryKey` then the first key of the first model is used.

```javascript
$snapshot.setCollection(collection, primaryKey);
```

<small>(`primaryKey` is an optional parameter.)</small>

Snapshot listens for three events natively, and these are handled automatically.

 * `snapshot/:namespace/perPage` &ndash; Set amount per page;
 * `snapshot/:namespace/pageNumber` &ndash; Set current page number;
 * `snapshot/:namespace/sortBy` &ndash; Set order column and ascending/descending;

As Snapshot supports multiple instances, a namespace is used to distinguish the events. If you don't explicitly specify a namespace in the instantiation then it will be `default`. Therefore all of your events will be: `snapshot/default/perPage`, `snapshot/default/pageNumber` and `snapshot/default/sortBy`.

<small>(`:namespace` is the name you provided upon instantiation of `Snapshot` &ndash; if you didn't, then it's `default`.)</small>

When the collection has been updated, Snapshot emits the `snapshot/:namespace/contentUpdated` event, passing through the snapshot as the first argument.

For sorting by any given column, you can emit the `snapshot/:namespace/sortBy` event with a simple hash. If you omit the `direction` property (or set its value to `false`) then Snapshot will cleverly invert the current sorting direction for you.

```javascript
socket.emit('snapshot/:namespace/sortBy', {
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

    $snapshot.applyFilter('word', function(dimension) {

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
$snapshot.clearFilter('word');
```

You can also clear every single filter by using the `clearFilters` method.

```javascript
$snapshot.clearFilters();
```

Multiple Instances
-----------

When instantiating Snapshot you should pass in the namespace for the current collection &ndash; that way you could create a new instance of `Snapshot` with a unique collection of models.

```javascript
var $dogs       = new Snapshot('dogs').bootstrap(socket).useDelta(false);
var $cats       = new Snapshot('cats').bootstrap(socket).useDelta(false);
var $rabbits    = new Snapshot('rabbits').bootstrap(socket).useDelta(false);
```

If you don't create a namespace, the namespace will be set to `default`.

Delta Updates
-----------

There may be instances where sending delta updates is preferable to re-sending whole models. Snapshot supports the providing of delta updates &ndash; essentially, any models that have already been transmitted across the wire will not be sent again in their entirety; instead only their primary ID is sent.

```javascript
var $snapshot = new Snapshot().bootstrap(socket).useDelta(true);
```

Once you've enabled delta updates using `useDelta(true)` as part of the bootstrap process, Snapshot will keeps a history of transmitted models. It's crucial that you set the appropriate primary ID when invoking `setCollection`, otherwise a default primary key will be assumed.

```javascript
$snapshot.setCollection([{ id: 1 }, { id: 2 }, { id: 3 }], 'id');
```

Since unique models will <strong>only</strong> ever be transmitted once, it's imperative that you keep a history of all models from the `snapshot/:namespace/contentUpdated` event, and then to utilise those from your local cache when you come across a delta model.

Delta models are nothing more than the primary key of the model, which will help you lookup the model from your own collection cache. Therefore to detect a delta model, simply use something like `Number.isFinite` (or Underscore's `_.isNumber`) on the returned collection.

```javascript
socket.on('snapshot/:namespace/contentUpdated', function(data) {

    _.forEach(data, function(model) {

        if (_.isNumber(model)) {
            // Delta model!
            return;
        }

        // ...

    });

});
```

Architecture
-----------

Below is a simple diagram of how Snapshot works. It demonstrates how the `snapshot/:namespace/pageNumber` event operates &ndash; which is also the same way other native Snapshot events function. It also demonstrates the flow of custom filters.

<img src="http://oi42.tinypic.com/v33vb9.jpg alt="Snapshot Architecture" />

 * Browser establishes a WebSocket connection to Node.js &ndash; models are added;
 * Browser emits `snapshot/:namespace/pageNumber` event with data (example);
 * Snapshot along with Crossfilter updates the collection <i>snapshot</i>;
 * Snapshot emits `snapshot/:namespace/contentUpdated` event with the updated collection;
 * Browser emits a custom event (`customFilterApplied`) with the data;
 * Node.js listens for the `customFilterApplied` event and then interacts with Snapshot;
 * Snapshot emits the `snapshot/:namespace/contentUpdated` event with the updated filter applied;

Unit Testing
-----------

Grunt is a prerequisite to run the Jasmine tests, which is installed when you run `npm install`. Afterwards all of Snapshot's unit tests can be run with the `grunt test` command from the terminal.

Angular
-----------

<img src="https://lh6.googleusercontent.com/-DtPuPzooNEY/AAAAAAAAAAI/AAAAAAAAAC4/6Y1jxzshd4g/photo.jpg?sz=48" alt="Angular.js" />

Snapshot also comes with a bundled Angular module for easier interaction. Simply add `$snapshot` as a dependency and you have everything you need.