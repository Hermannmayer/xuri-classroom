// webpack module 20108 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./78426.js");
var i = require("./61230.js");
module.exports = "".repeat || function (e) {
  var t = String(i(this));
  var r = "";
  var o = n(e);
  if (o < 0 || o == Infinity) {
    throw RangeError("Wrong number of repetitions");
  }
  for (; o > 0; (o >>>= 1) && (t += t)) {
    if (o & 1) {
      r += t;
    }
  }
  return r;
};
};
