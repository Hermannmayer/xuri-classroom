// webpack module 49261 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./16870.js");
var o = Math.abs;
var a = Math.pow;
n({
  target: "Math",
  stat: true
}, {
  cbrt: function (e) {
    return i(e = +e) * a(o(e), 1 / 3);
  }
});
};
