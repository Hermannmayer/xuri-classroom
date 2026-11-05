// webpack module 39801 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./27015.js");
var o = Math.imul;
var a = i(function () {
  return o(4294967295, 5) != -5 || o.length != 2;
});
n({
  target: "Math",
  stat: true,
  forced: a
}, {
  imul: function (e, t) {
    var r = 65535;
    var n = +e;
    var i = +t;
    var o = r & n;
    var a = r & i;
    return o * a + ((r & n >>> 16) * a + o * (r & i >>> 16) << 16 >>> 0) | 0;
  }
});
};
