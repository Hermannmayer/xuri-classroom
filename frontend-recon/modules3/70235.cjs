// webpack module 70235 — body from webcrack
module.exports = function (module, exports, require) {
function t(e, t, r, n) {
  var i = -1;
  var o = e == null ? 0 : e.length;
  if (n && o) {
    r = e[++i];
  }
  while (++i < o) {
    r = t(r, e[i], i, e);
  }
  return r;
}
module.exports = t;
};
