// webpack module 63133 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./66845.js");
var i = require("./2381.js").f;
var o = {}.toString;
var a = typeof window == "object" && window && Object.getOwnPropertyNames ? Object.getOwnPropertyNames(window) : [];
function s(e) {
  try {
    return i(e);
  } catch (t) {
    return a.slice();
  }
}
module.exports.f = function (e) {
  if (a && o.call(e) == "[object Window]") {
    return s(e);
  } else {
    return i(n(e));
  }
};
};
