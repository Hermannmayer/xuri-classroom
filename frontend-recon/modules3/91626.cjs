// webpack module 91626 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./27015.js");
function i(e, t) {
  return RegExp(e, t);
}
exports.UNSUPPORTED_Y = n(function () {
  var e = i("a", "y");
  e.lastIndex = 2;
  return e.exec("abcd") != null;
});
exports.BROKEN_CARET = n(function () {
  var e = i("^r", "gy");
  e.lastIndex = 2;
  return e.exec("str") != null;
});
};
