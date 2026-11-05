// webpack module 48167 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./79456.js");
var i = require("./83232.js");
module.exports = function (e) {
  var t = i(e);
  if (typeof t != "function") {
    throw TypeError(String(e) + " is not iterable");
  }
  return n(t.call(e));
};
};
