// webpack module 62190 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./28445.js");
var i = require("./8801.js");
module.exports = function (e, t) {
  var r = e.exec;
  if (typeof r === "function") {
    var o = r.call(e, t);
    if (typeof o !== "object") {
      throw TypeError("RegExp exec method returned something other than an Object or null");
    }
    return o;
  }
  if (n(e) !== "RegExp") {
    throw TypeError("RegExp#exec called on incompatible receiver");
  }
  return i.call(e, t);
};
};
