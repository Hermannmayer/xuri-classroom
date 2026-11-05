// webpack module 95539 — body from webcrack
module.exports = function (module, exports, require) {
function t(e, t) {
  var r = -1;
  var n = e == null ? 0 : e.length;
  var i = Array(n);
  while (++r < n) {
    i[r] = t(e[r], r, e);
  }
  return i;
}
module.exports = t;
};
