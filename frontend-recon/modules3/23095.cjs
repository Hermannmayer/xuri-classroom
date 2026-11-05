// webpack module 23095 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = Math.floor;
var o = Math.log;
var a = Math.LOG2E;
n({
  target: "Math",
  stat: true
}, {
  clz32: function (e) {
    if (e >>>= 0) {
      return 31 - i(o(e + 0.5) * a);
    } else {
      return 32;
    }
  }
});
};
