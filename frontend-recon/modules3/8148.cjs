// webpack module 8148 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./73713.js").IteratorPrototype;
var i = require("./18203.js");
var o = require("./26244.js");
var a = require("./65147.js");
var s = require("./33311.js");
function u() {
  return this;
}
module.exports = function (e, t, r) {
  var l = t + " Iterator";
  e.prototype = i(n, {
    next: o(1, r)
  });
  a(e, l, false, true);
  s[l] = u;
  return e;
};
};
