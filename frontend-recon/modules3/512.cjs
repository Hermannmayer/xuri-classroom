// webpack module 512 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = Math.atanh;
var o = Math.log;
n({
  target: "Math",
  stat: true,
  forced: !i || !(1 / i(-0) < 0)
}, {
  atanh: function (e) {
    if ((e = +e) == 0) {
      return e;
    } else {
      return o((1 + e) / (1 - e)) / 2;
    }
  }
});
};
