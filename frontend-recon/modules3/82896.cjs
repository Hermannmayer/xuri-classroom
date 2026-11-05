// webpack module 82896 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./27015.js");
var o = require("./22175.js");
var a = i(function () {
  function e() {}
  return !(Array.of.call(e) instanceof e);
});
n({
  target: "Array",
  stat: true,
  forced: a
}, {
  of: function () {
    var e = 0;
    var t = arguments.length;
    var r = new (typeof this == "function" ? this : Array)(t);
    while (t > e) {
      o(r, e, arguments[e++]);
    }
    r.length = t;
    return r;
  }
});
};
