// webpack module 55878 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = require("./89281.js");
var o = require("./15595.js");
var a = require("./22319.js");
var s = require("./71892.js");
var u = require("./20563.js");
var l = i("wks");
var c = n.Symbol;
var p = u ? c : c && c.withoutSetter || a;
module.exports = function (e) {
  if (!o(l, e)) {
    if (s && o(c, e)) {
      l[e] = c[e];
    } else {
      l[e] = p("Symbol." + e);
    }
  }
  return l[e];
};
};
