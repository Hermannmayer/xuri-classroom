// webpack module 26701 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cloneElement = u;
exports.isFragment = a;
exports.isValidElement = undefined;
exports.replaceElement = s;
var i = n(require("./59496.js"));
var o = exports.isValidElement = i.isValidElement;
function a(e) {
  return e && o(e) && e.type === i.Fragment;
}
function s(e, t, r) {
  if (o(e)) {
    return i.cloneElement(e, typeof r === "function" ? r(e.props || {}) : r);
  } else {
    return t;
  }
}
function u(e, t) {
  return s(e, e, t);
}
};
