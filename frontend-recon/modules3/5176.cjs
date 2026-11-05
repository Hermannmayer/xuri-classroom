// webpack module 5176 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
n({
  target: "Math",
  stat: true
}, {
  umulh: function (e, t) {
    var r = 65535;
    var n = +e;
    var i = +t;
    var o = n & r;
    var a = i & r;
    var s = n >>> 16;
    var u = i >>> 16;
    var l = (s * a >>> 0) + (o * a >>> 16);
    return s * u + (l >>> 16) + ((o * u >>> 0) + (l & r) >>> 16);
  }
});
};
