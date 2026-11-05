// webpack module 13093 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60730.js");
function i(e) {
  var t;
  var r;
  this.promise = new e(function (e, n) {
    if (t !== undefined || r !== undefined) {
      throw TypeError("Bad Promise constructor");
    }
    t = e;
    r = n;
  });
  this.resolve = n(t);
  this.reject = n(r);
}
module.exports.f = function (e) {
  return new i(e);
};
};
