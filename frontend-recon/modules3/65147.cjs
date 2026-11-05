// webpack module 65147 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./75386.js").f;
var i = require("./15595.js");
var o = require("./55878.js");
var a = o("toStringTag");
module.exports = function (e, t, r) {
  if (e && !i(e = r ? e : e.prototype, a)) {
    n(e, a, {
      configurable: true,
      value: t
    });
  }
};
};
