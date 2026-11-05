// webpack module 73440 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  kP: function () {
    return o;
  }
});
function n(e) {
  return crypto.getRandomValues(new Uint8Array(e));
}
function i(e, t, r) {
  var n = (2 << Math.log(e.length - 1) / Math.LN2) - 1;
  var i = -~(n * 1.6 * t / e.length);
  return function (o = t) {
    var a = "";
    while (1) {
      var s = r(i);
      var u = i | 0;
      while (u--) {
        a += e[s[u] & n] || "";
        if (a.length === o) {
          return a;
        }
      }
    }
  };
}
function o(e, t = 21) {
  return i(e, t, n);
}
};
