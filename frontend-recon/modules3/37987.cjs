// webpack module 37987 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./92695.js");
var i = require("./22674.js");
var o = require("./26244.js");
var a = require("./66845.js");
var s = require("./45867.js");
var u = require("./15595.js");
var l = require("./5030.js");
var c = Object.getOwnPropertyDescriptor;
exports.f = n ? c : function (e, t) {
  e = a(e);
  t = s(t, true);
  if (l) {
    try {
      return c(e, t);
    } catch (r) {}
  }
  if (u(e, t)) {
    return o(!i.f.call(e, t), e[t]);
  }
};
};
