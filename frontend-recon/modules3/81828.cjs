// webpack module 81828 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./27015.js");
var i = require("./55878.js");
var o = require("./27481.js");
var a = i("species");
module.exports = function (e) {
  return o >= 51 || !n(function () {
    var t = [];
    var r = t.constructor = {};
    r[a] = function () {
      return {
        foo: 1
      };
    };
    return t[e](Boolean).foo !== 1;
  });
};
};
