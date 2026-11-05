// webpack module 69721 — body from webcrack
module.exports = function (module, exports, require) {
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.call = u;
exports.default = undefined;
exports.note = a;
exports.noteOnce = c;
exports.preMessage = undefined;
exports.resetWarned = s;
exports.warning = o;
exports.warningOnce = l;
var r = {};
var n = [];
var i = exports.preMessage = function (e) {
  n.push(e);
};
function o(e, t) {}
function a(e, t) {}
function s() {
  r = {};
}
function u(e, t, n) {
  if (!t && !r[n]) {
    e(false, n);
    r[n] = true;
  }
}
function l(e, t) {
  u(o, e, t);
}
function c(e, t) {
  u(a, e, t);
}
l.preMessage = i;
l.resetWarned = s;
l.noteOnce = c;
exports.default = l;
};
