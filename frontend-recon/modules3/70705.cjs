// webpack module 70705 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
n({
  target: "Math",
  stat: true
}, {
  isubh: function (e, t, r, n) {
    var i = e >>> 0;
    var o = t >>> 0;
    var a = r >>> 0;
    return o - (n >>> 0) - ((~i & a | ~(i ^ a) & i - a >>> 0) >>> 31) | 0;
  }
});
};
