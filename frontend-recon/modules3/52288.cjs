// webpack module 52288 — body from webcrack
module.exports = function (module, exports, require) {
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;
function r(e) {
  return +setTimeout(e, 16);
}
function n(e) {
  return clearTimeout(e);
}
if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
  r = function (e) {
    return window.requestAnimationFrame(e);
  };
  n = function (e) {
    return window.cancelAnimationFrame(e);
  };
}
var i = 0;
var o = new Map();
function a(e) {
  o.delete(e);
}
function s(e, t = 1) {
  i += 1;
  var n = i;
  function s(t) {
    if (t === 0) {
      a(n);
      e();
    } else {
      var i = r(function () {
        s(t - 1);
      });
      o.set(n, i);
    }
  }
  s(t);
  return n;
}
s.cancel = function (e) {
  var t = o.get(e);
  a(e);
  return n(t);
};
exports.default = s;
};
