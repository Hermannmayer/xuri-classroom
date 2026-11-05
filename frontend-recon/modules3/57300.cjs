// webpack module 57300 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./79456.js");
module.exports = function () {
  var e = n(this);
  var t = "";
  if (e.global) {
    t += "g";
  }
  if (e.ignoreCase) {
    t += "i";
  }
  if (e.multiline) {
    t += "m";
  }
  if (e.dotAll) {
    t += "s";
  }
  if (e.unicode) {
    t += "u";
  }
  if (e.sticky) {
    t += "y";
  }
  return t;
};
};
