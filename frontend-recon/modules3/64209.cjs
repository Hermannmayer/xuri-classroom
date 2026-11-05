// webpack module 64209 — body from webcrack
module.exports = function (module, exports, require) {
function n(e, t) {
  var r = e;
  for (var n = 0; n < t.length; n += 1) {
    if (r === null || r === undefined) {
      return;
    }
    r = r[t[n]];
  }
  return r;
}
require.d(exports, {
  Z: function () {
    return n;
  }
});
};
