(function() {

"use strict";

 angular.module("config", [])

.constant("ENV", {
  "name": "production",
  "socketEndpoint": "http://node-snapshot.herokuapp.com/"
})

; }());