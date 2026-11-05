// webpack module 56747 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMergedStatus = undefined;
exports.getStatusClassNames = s;
var i = n(require("./14389.js"));
var o = n(require("./38399.js"));
var a = require("./32543.js");
(0, a.tuple)("warning", "error", "");
function s(e, t, r) {
  return (0, o.default)((0, i.default)((0, i.default)((0, i.default)((0, i.default)((0, i.default)({}, `${e}-status-success`, t === "success"), `${e}-status-warning`, t === "warning"), `${e}-status-error`, t === "error"), `${e}-status-validating`, t === "validating"), `${e}-has-feedback`, r));
}
exports.getMergedStatus = function (e, t) {
  return t || e;
};
};
