// webpack module 96128 — body from webcrack
module.exports = function (module, exports, require) {
function n(e, t) {
  if (e == null) {
    return {};
  }
  var r = {};
  for (var n in e) {
    if ({}.hasOwnProperty.call(e, n)) {
      if (t.indexOf(n) !== -1) {
        continue;
      }
      r[n] = e[n];
    }
  }
  return r;
}
require.d(exports, {
  Z: function () {
    return n;
  }
});
};
