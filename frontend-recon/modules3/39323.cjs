// webpack module 39323 — body from webcrack
module.exports = function (module, exports, require) {
function n(e, t) {
  if (!e) {
    return false;
  }
  if (e.contains) {
    return e.contains(t);
  }
  var r = t;
  while (r) {
    if (r === e) {
      return true;
    }
    r = r.parentNode;
  }
  return false;
}
require.d(exports, {
  Z: function () {
    return n;
  }
});
};
