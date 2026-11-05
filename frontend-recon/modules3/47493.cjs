// webpack module 47493 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  iS: function () {
    return i;
  },
  yL: function () {
    return o;
  },
  zR: function () {
    return s;
  },
  wr: function () {
    return u;
  }
});
var n = require("./87183.js");
var i = 200;
var o = 10240;
var a = (0, n.LO)({
  maxSizeMb: i
});
function s(e) {
  a.maxSizeMb = e && Number.isInteger(e) && e >= 1 && e <= o ? e : i;
}
function u(e) {
  var t = a.maxSizeMb;
  if (e && Number.isFinite(e) && e > 0) {
    return Math.min(e, t);
  } else {
    return t;
  }
}
};
