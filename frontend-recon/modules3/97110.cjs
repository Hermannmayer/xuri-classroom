// webpack module 97110 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = n.isFinite;
module.exports = Number.isFinite || function (e) {
  return typeof e == "number" && i(e);
};
};
