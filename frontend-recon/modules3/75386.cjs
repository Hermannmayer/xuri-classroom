// webpack module 75386 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./92695.js");
var i = require("./5030.js");
var o = require("./79456.js");
var a = require("./45867.js");
var s = Object.defineProperty;
exports.f = n ? s : function (e, t, r) {
  o(e);
  t = a(t, true);
  o(r);
  if (i) {
    try {
      return s(e, t, r);
    } catch (n) {}
  }
  if ("get" in r || "set" in r) {
    throw TypeError("Accessors not supported");
  }
  if ("value" in r) {
    e[t] = r.value;
  }
  return e;
};
};
