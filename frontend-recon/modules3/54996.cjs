// webpack module 54996 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./55477.js");
var o = require("./30685.js");
var a = require("./41216.js");
var s = require("./74804.js");
var u = require("./98199.js");
var l = require("./33758.js");
var c = require("./5659.js");
var p = require("./27015.js");
var d = require("./8275.js");
var f = require("./65147.js");
var g = require("./73900.js");
module.exports = function (e, t, r) {
  var m = e.indexOf("Map") !== -1;
  var v = e.indexOf("Weak") !== -1;
  var y = m ? "set" : "add";
  var h = i[e];
  var b = h && h.prototype;
  var w = h;
  var x = {};
  function E(e) {
    var t = b[e];
    a(b, e, e == "add" ? function (e) {
      t.call(this, e === 0 ? 0 : e);
      return this;
    } : e == "delete" ? function (e) {
      return (!v || !!c(e)) && t.call(this, e === 0 ? 0 : e);
    } : e == "get" ? function (e) {
      if (v && !c(e)) {
        return undefined;
      } else {
        return t.call(this, e === 0 ? 0 : e);
      }
    } : e == "has" ? function (e) {
      return (!v || !!c(e)) && t.call(this, e === 0 ? 0 : e);
    } : function (e, r) {
      t.call(this, e === 0 ? 0 : e, r);
      return this;
    });
  }
  if (o(e, typeof h != "function" || !v && (!b.forEach || !!p(function () {
    new h().entries().next();
  })))) {
    w = r.getConstructor(t, e, m, y);
    s.REQUIRED = true;
  } else if (o(e, true)) {
    var k = new w();
    var S = k[y](v ? {} : -0, 1) != k;
    var T = p(function () {
      k.has(1);
    });
    var C = d(function (e) {
      new h(e);
    });
    var A = !v && p(function () {
      var e = new h();
      var t = 5;
      while (t--) {
        e[y](t, t);
      }
      return !e.has(-0);
    });
    if (!C) {
      w = t(function (t, r) {
        l(t, w, e);
        var n = g(new h(), t, w);
        if (r != undefined) {
          u(r, n[y], n, m);
        }
        return n;
      });
      w.prototype = b;
      b.constructor = w;
    }
    if (T || A) {
      E("delete");
      E("has");
      if (m) {
        E("get");
      }
    }
    if (A || S) {
      E(y);
    }
    if (v && b.clear) {
      delete b.clear;
    }
  }
  x[e] = w;
  n({
    global: true,
    forced: w != h
  }, x);
  f(w, e);
  if (!v) {
    r.setStrong(w, e, m);
  }
  return w;
};
};
