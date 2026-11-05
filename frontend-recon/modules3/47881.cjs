// webpack module 47881 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./92695.js");
var i = require("./75386.js").f;
var o = Function.prototype;
var a = o.toString;
var s = /^\s*function ([^ (]*)/;
var u = "name";
if (n && !(u in o)) {
  i(o, u, {
    configurable: true,
    get: function () {
      try {
        return a.call(this).match(s)[1];
      } catch (e) {
        return "";
      }
    }
  });
}
};
