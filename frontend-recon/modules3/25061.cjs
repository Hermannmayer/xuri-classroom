// webpack module 25061 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./27015.js");
var o = require("./65561.js");
var a = Math.abs;
var s = Math.exp;
var u = Math.E;
var l = i(function () {
  return Math.sinh(-2e-17) != -2e-17;
});
n({
  target: "Math",
  stat: true,
  forced: l
}, {
  sinh: function (e) {
    if (a(e = +e) < 1) {
      return (o(e) - o(-e)) / 2;
    } else {
      return (s(e - 1) - s(-e - 1)) * (u / 2);
    }
  }
});
};
