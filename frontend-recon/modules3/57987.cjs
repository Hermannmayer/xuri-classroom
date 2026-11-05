// webpack module 57987 — body from webcrack
module.exports = function (module, exports, require) {
function n(e, t) {
  if (t == null || t > e.length) {
    t = e.length;
  }
  for (var r = 0, n = Array(t); r < t; r++) {
    n[r] = e[r];
  }
  return n;
}
require.d(exports, {
  Z: function () {
    return n;
  }
});
};
