// webpack module 1469 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = function (e, t) {
  var r = {};
  for (var n = Object.keys(e), i = Array.isArray(t), o = 0; o < n.length; o++) {
    var a = n[o];
    var s = e[a];
    if (i ? t.indexOf(a) !== -1 : t(a, s, e)) {
      r[a] = s;
    }
  }
  return r;
};
};
