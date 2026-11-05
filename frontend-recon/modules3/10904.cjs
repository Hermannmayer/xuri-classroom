// webpack module 10904 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = require("./74848.js").trim;
var o = require("./38134.js");
var a = n.parseInt;
var s = /^[+-]?0[Xx]/;
var u = a(o + "08") !== 8 || a(o + "0x16") !== 22;
module.exports = u ? function (e, t) {
  var r = i(String(e));
  return a(r, t >>> 0 || (s.test(r) ? 16 : 10));
} : a;
};
