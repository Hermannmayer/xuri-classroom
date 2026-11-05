// webpack module 14765 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./63568.js");
var i = require("./7032.js");
var o = require("./19440.js");
module.exports = n ? function (e) {
  return n(e);
} : i ? function (e) {
  if (!e || typeof e !== "object" && typeof e !== "function") {
    throw new TypeError("getProto: not an object");
  }
  return i(e);
} : o ? function (e) {
  return o(e);
} : null;
};
