// webpack module 73900 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./5659.js");
var i = require("./82369.js");
module.exports = function (e, t, r) {
  var o;
  var a;
  if (i && typeof (o = t.constructor) == "function" && o !== r && n(a = o.prototype) && a !== r.prototype) {
    i(e, a);
  }
  return e;
};
};
