// webpack module 92895 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
n({
  target: "Math",
  stat: true
}, {
  signbit: function (e) {
    if ((e = +e) == e && e == 0) {
      return 1 / e == -Infinity;
    } else {
      return e < 0;
    }
  }
});
};
