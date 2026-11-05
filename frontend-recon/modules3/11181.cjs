// webpack module 11181 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./92695.js");
var i = require("./55477.js");
var o = require("./30685.js");
var a = require("./73900.js");
var s = require("./75386.js").f;
var u = require("./2381.js").f;
var l = require("./86930.js");
var c = require("./57300.js");
var p = require("./91626.js");
var d = require("./41216.js");
var f = require("./27015.js");
var g = require("./71478.js").set;
var m = require("./69360.js");
var v = require("./55878.js");
var y = v("match");
var h = i.RegExp;
var b = h.prototype;
var w = /a/g;
var x = /a/g;
var E = new h(w) !== w;
var k = p.UNSUPPORTED_Y;
var S = n && o("RegExp", !E || k || f(function () {
  x[y] = false;
  return h(w) != w || h(x) == x || h(w, "i") != "/a/i";
}));
if (S) {
  function T(e, t) {
    var r;
    var n = this instanceof T;
    var i = l(e);
    var o = t === undefined;
    if (!n && i && e.constructor === T && o) {
      return e;
    }
    if (E) {
      if (i && !o) {
        e = e.source;
      }
    } else if (e instanceof T) {
      if (o) {
        t = c.call(e);
      }
      e = e.source;
    }
    if (k) {
      r = !!t && t.indexOf("y") > -1;
      if (r) {
        t = t.replace(/y/g, "");
      }
    }
    var s = a(E ? new h(e, t) : h(e, t), n ? this : b, T);
    if (k && r) {
      g(s, {
        sticky: r
      });
    }
    return s;
  }
  function C(e) {
    if (!(e in T)) {
      s(T, e, {
        configurable: true,
        get: function () {
          return h[e];
        },
        set: function (t) {
          h[e] = t;
        }
      });
    }
  }
  var A = u(h);
  var _ = 0;
  while (A.length > _) {
    C(A[_++]);
  }
  b.constructor = T;
  T.prototype = b;
  d(i, "RegExp", T);
}
m("RegExp");
};
