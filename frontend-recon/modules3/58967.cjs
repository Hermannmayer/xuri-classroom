// webpack module 58967 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./65561.js");
var o = Math.exp;
n({
  target: "Math",
  stat: true
}, {
  tanh: function (e) {
    var t = i(e = +e);
    var r = i(-e);
    if (t == Infinity) {
      return 1;
    } else if (r == Infinity) {
      return -1;
    } else {
      return (t - r) / (o(e) + o(-e));
    }
  }
});
};
