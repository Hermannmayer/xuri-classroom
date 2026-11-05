// webpack module 81285 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./16870.js");
var i = Math.abs;
var o = Math.pow;
var a = o(2, -52);
var s = o(2, -23);
var u = o(2, 127) * (2 - s);
var l = o(2, -126);
function c(e) {
  return e + 1 / a - 1 / a;
}
module.exports = Math.fround || function (e) {
  var t;
  var r;
  var o = i(e);
  var p = n(e);
  if (o < l) {
    return p * c(o / l / s) * l * s;
  } else {
    t = (1 + s / a) * o;
    r = t - (t - o);
    if (r > u || r != r) {
      return p * Infinity;
    } else {
      return p * r;
    }
  }
};
};
