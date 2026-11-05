// webpack module 69360 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./41497.js");
var i = require("./75386.js");
var o = require("./55878.js");
var a = require("./92695.js");
var s = o("species");
module.exports = function (e) {
  var t = n(e);
  var r = i.f;
  if (a && t && !t[s]) {
    r(t, s, {
      configurable: true,
      get: function () {
        return this;
      }
    });
  }
};
};
