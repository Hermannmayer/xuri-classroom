// webpack module 39125 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = Math.log;
var o = Math.LOG10E;
n({
  target: "Math",
  stat: true
}, {
  log10: function (e) {
    return i(e) * o;
  }
});
};
