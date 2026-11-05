// webpack module 46891 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./55226.js");
var o = Math.acosh;
var a = Math.log;
var s = Math.sqrt;
var u = Math.LN2;
var l = !o || Math.floor(o(Number.MAX_VALUE)) != 710 || o(Infinity) != Infinity;
n({
  target: "Math",
  stat: true,
  forced: l
}, {
  acosh: function (e) {
    if ((e = +e) < 1) {
      return NaN;
    } else if (e > 94906265.62425156) {
      return a(e) + u;
    } else {
      return i(e - 1 + s(e - 1) * s(e + 1));
    }
  }
});
};
