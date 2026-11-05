// webpack module 46652 — body from webcrack
module.exports = function (module, exports, require) {
function t(e, t, r) {
  var n = -1;
  var i = e.length;
  if (t < 0) {
    t = -t > i ? 0 : i + t;
  }
  r = r > i ? i : r;
  if (r < 0) {
    r += i;
  }
  i = t > r ? 0 : r - t >>> 0;
  t >>>= 0;
  var o = Array(i);
  while (++n < i) {
    o[n] = e[n + t];
  }
  return o;
}
module.exports = t;
};
