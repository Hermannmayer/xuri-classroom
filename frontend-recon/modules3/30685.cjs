// webpack module 30685 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./27015.js");
var i = /#|\.prototype\./;
function o(e, t) {
  var r = s[a(e)];
  return r == l || r != u && (typeof t == "function" ? n(t) : !!t);
}
var a = o.normalize = function (e) {
  return String(e).replace(i, ".").toLowerCase();
};
var s = o.data = {};
var u = o.NATIVE = "N";
var l = o.POLYFILL = "P";
module.exports = o;
};
