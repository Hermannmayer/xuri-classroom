// webpack module 65561 — body from webcrack
module.exports = function (module, exports, require) {
var t = Math.expm1;
var r = Math.exp;
module.exports = !t || t(10) > 22025.465794806718 || t(10) < 22025.465794806718 || t(-2e-17) != -2e-17 ? function (e) {
  if ((e = +e) == 0) {
    return e;
  } else if (e > -0.000001 && e < 0.000001) {
    return e + e * e / 2;
  } else {
    return r(e) - 1;
  }
} : t;
};
