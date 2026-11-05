// webpack module 29477 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./78426.js");
var i = Math.max;
var o = Math.min;
module.exports = function (e, t) {
  var r = n(e);
  if (r < 0) {
    return i(r + t, 0);
  } else {
    return o(r, t);
  }
};
};
