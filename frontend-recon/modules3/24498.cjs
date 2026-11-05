// webpack module 24498 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./92695.js");
var i = require("./27015.js");
var o = require("./81504.js");
var a = require("./15614.js");
var s = require("./22674.js");
var u = require("./41630.js");
var l = require("./95051.js");
var c = Object.assign;
var p = Object.defineProperty;
module.exports = !c || i(function () {
  if (n && c({
    b: 1
  }, c(p({}, "a", {
    enumerable: true,
    get: function () {
      p(this, "b", {
        value: 3,
        enumerable: false
      });
    }
  }), {
    b: 2
  })).b !== 1) {
    return true;
  }
  var e = {};
  var t = {};
  var r = Symbol();
  var i = "abcdefghijklmnopqrst";
  e[r] = 7;
  i.split("").forEach(function (e) {
    t[e] = e;
  });
  return c({}, e)[r] != 7 || o(c({}, t)).join("") != i;
}) ? function (e, t) {
  var r = u(e);
  var i = arguments.length;
  var c = 1;
  var p = a.f;
  var d = s.f;
  while (i > c) {
    var f;
    var g = l(arguments[c++]);
    var m = p ? o(g).concat(p(g)) : o(g);
    var v = m.length;
    var y = 0;
    while (v > y) {
      f = m[y++];
      if (!n || !!d.call(g, f)) {
        r[f] = g[f];
      }
    }
  }
  return r;
} : c;
};
