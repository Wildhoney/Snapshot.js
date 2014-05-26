(function() {

"use strict";

 angular.module("config", [])

.constant("ENV", {
  "name": "development",
  "socketEndpoint": "http://localhost:3001/"
})

; }());