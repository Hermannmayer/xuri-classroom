// webpack module 5919 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  G: function () {
    return a;
  }
});
var n = require("./67361.js");
function i(e) {
  if ((0, n.Z)() && window.document.documentElement) {
    var t = Array.isArray(e) ? e : [e];
    var r = window.document.documentElement;
    return t.some(function (e) {
      return e in r.style;
    });
  }
  return false;
}
function o(e, t) {
  if (!i(e)) {
    return false;
  }
  var r = document.createElement("div");
  var n = r.style[e];
  r.style[e] = t;
  return r.style[e] !== n;
}
function a(e, t) {
  if (Array.isArray(e) || t === undefined) {
    return i(e);
  } else {
    return o(e, t);
  }
}
};
