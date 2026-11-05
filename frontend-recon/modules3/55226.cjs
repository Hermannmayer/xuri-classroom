// webpack module 55226 — body from webcrack
module.exports = function (module, exports, require) {
var t = Math.log;
module.exports = Math.log1p || function (e) {
  if ((e = +e) > -1e-8 && e < 1e-8) {
    return e - e * e / 2;
  } else {
    return t(1 + e);
  }
};
};
