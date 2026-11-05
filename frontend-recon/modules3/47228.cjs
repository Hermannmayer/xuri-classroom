// webpack module 47228 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./92695.js");
var o = require("./34931.js");
var a = require("./66845.js");
var s = require("./37987.js");
var u = require("./22175.js");
n({
  target: "Object",
  stat: true,
  sham: !i
}, {
  getOwnPropertyDescriptors: function (e) {
    var t;
    var r;
    var n = a(e);
    var i = s.f;
    var l = o(n);
    var c = {};
    var p = 0;
    while (l.length > p) {
      r = i(n, t = l[p++]);
      if (r !== undefined) {
        u(c, t, r);
      }
    }
    return c;
  }
});
};
