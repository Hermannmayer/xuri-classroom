// webpack module 89407 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./78426.js");
module.exports = function (e) {
  var t = n(e);
  if (t < 0) {
    throw RangeError("The argument can't be less than 0");
  }
  return t;
};
};
