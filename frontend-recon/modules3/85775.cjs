// webpack module 85775 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./65561.js");
var o = Math.cosh;
var a = Math.abs;
var s = Math.E;
n({
  target: "Math",
  stat: true,
  forced: !o || o(710) === Infinity
}, {
  cosh: function (e) {
    var t = i(a(e) - 1) + 1;
    return (t + 1 / (t * s * s)) * (s / 2);
  }
});
};
