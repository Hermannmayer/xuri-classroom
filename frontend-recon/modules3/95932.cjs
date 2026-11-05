// webpack module 95932 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./57108.js");
var i = require("./6613.js");
var o = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
var a = "\\u0300-\\u036f";
var s = "\\ufe20-\\ufe2f";
var u = "\\u20d0-\\u20ff";
var l = a + s + u;
var c = "[" + l + "]";
var p = RegExp(c, "g");
function d(e) {
  e = i(e);
  return e && e.replace(o, n).replace(p, "");
}
module.exports = d;
};
