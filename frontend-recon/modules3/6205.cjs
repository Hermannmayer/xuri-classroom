// webpack module 6205 — body from webcrack
module.exports = function (module, exports, require) {
exports.__esModule = true;
exports.camelCase = undefined;
var r = /^--[a-zA-Z0-9-]+$/;
var n = /-([a-z])/g;
var i = /^[^-]+$/;
var o = /^-(webkit|moz|ms|o|khtml)-/;
var a = /^-(ms)-/;
function s(e) {
  return !e || i.test(e) || r.test(e);
}
function u(e, t) {
  return t.toUpperCase();
}
function l(e, t) {
  return `${t}-`;
}
function c(e, t = {}) {
  if (s(e)) {
    return e;
  } else {
    e = e.toLowerCase();
    e = t.reactCompat ? e.replace(a, l) : e.replace(o, l);
    return e.replace(n, u);
  }
}
exports.camelCase = c;
};
