// webpack module 7934 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./41497.js");
var o = require("./60730.js");
var a = require("./79456.js");
var s = require("./5659.js");
var u = require("./18203.js");
var l = require("./21273.js");
var c = require("./27015.js");
var p = i("Reflect", "construct");
var d = c(function () {
  function e() {}
  return !(p(function () {}, [], e) instanceof e);
});
var f = !c(function () {
  p(function () {});
});
var g = d || f;
n({
  target: "Reflect",
  stat: true,
  forced: g,
  sham: g
}, {
  construct: function (e, t) {
    o(e);
    a(t);
    var r = arguments.length < 3 ? e : o(arguments[2]);
    if (f && !d) {
      return p(e, t, r);
    }
    if (e == r) {
      switch (t.length) {
        case 0:
          return new e();
        case 1:
          return new e(t[0]);
        case 2:
          return new e(t[0], t[1]);
        case 3:
          return new e(t[0], t[1], t[2]);
        case 4:
          return new e(t[0], t[1], t[2], t[3]);
      }
      var n = [null];
      n.push.apply(n, t);
      return new (l.apply(e, n))();
    }
    var i = r.prototype;
    var c = u(s(i) ? i : Object.prototype);
    var g = Function.apply.call(e, c, t);
    if (s(g)) {
      return g;
    } else {
      return c;
    }
  }
});
};
