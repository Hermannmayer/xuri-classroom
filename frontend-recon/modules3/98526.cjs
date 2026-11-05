// webpack module 98526 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = Math.hypot;
var o = Math.abs;
var a = Math.sqrt;
var s = !!i && i(Infinity, NaN) !== Infinity;
n({
  target: "Math",
  stat: true,
  forced: s
}, {
  hypot: function (e, t) {
    var r;
    var n;
    var i = 0;
    var s = 0;
    var u = arguments.length;
    var l = 0;
    while (s < u) {
      r = o(arguments[s++]);
      if (l < r) {
        n = l / r;
        i = i * n * n + 1;
        l = r;
      } else if (r > 0) {
        n = r / l;
        i += n * n;
      } else {
        i += r;
      }
    }
    if (l === Infinity) {
      return Infinity;
    } else {
      return l * a(i);
    }
  }
});
};
