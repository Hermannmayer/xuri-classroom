// webpack module 55518 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return s;
  },
  F: function () {
    return u;
  }
});
var n = require("./21487.js");
var i = require("./38399.js");
var o = i;
var a = require("./57431.js");
(0, a.b)("warning", "error", "");
function s(e, t, r) {
  return o((0, n.Z)((0, n.Z)((0, n.Z)((0, n.Z)((0, n.Z)({}, `${e}-status-success`, t === "success"), `${e}-status-warning`, t === "warning"), `${e}-status-error`, t === "error"), `${e}-status-validating`, t === "validating"), `${e}-has-feedback`, r));
}
function u(e, t) {
  return t || e;
}
};
