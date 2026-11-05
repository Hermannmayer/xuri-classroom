// webpack module 49690 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = Math.min;
var o = Math.max;
n({
  target: "Math",
  stat: true
}, {
  clamp: function (e, t, r) {
    return i(r, o(t, e));
  }
});
};
