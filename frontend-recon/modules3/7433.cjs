// webpack module 7433 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = Math.log;
var o = Math.LN2;
n({
  target: "Math",
  stat: true
}, {
  log2: function (e) {
    return i(e) / o;
  }
});
};
