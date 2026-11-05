// webpack module 68044 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Kp: function () {
    return a;
  },
  ET: function () {
    return p;
  }
});
var n = {};
var i = [];
function o(e) {
  i.push(e);
}
function a(e, t) {}
function s(e, t) {}
function u() {
  n = {};
}
function l(e, t, r) {
  if (!t && !n[r]) {
    e(false, r);
    n[r] = true;
  }
}
function c(e, t) {
  l(a, e, t);
}
function p(e, t) {
  l(s, e, t);
}
c.preMessage = o;
c.resetWarned = u;
c.noteOnce = p;
exports.ZP = c;
};
