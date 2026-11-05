// webpack module 66439 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return u;
  }
});
var n = require("./57987.js");
function i(e) {
  if (Array.isArray(e)) {
    return (0, n.Z)(e);
  }
}
var o = require("./63629.js");
var a = require("./60995.js");
function s() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function u(e) {
  return i(e) || (0, o.Z)(e) || (0, a.Z)(e) || s();
}
};
