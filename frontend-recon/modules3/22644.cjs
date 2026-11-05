// webpack module 22644 — body from webcrack
module.exports = function (module, exports, require) {
var n = typeof Symbol !== "undefined" && Symbol;
var i = require("./32499.js");
module.exports = function () {
  return typeof n === "function" && typeof Symbol === "function" && typeof n("foo") === "symbol" && typeof Symbol("bar") === "symbol" && i();
};
};
