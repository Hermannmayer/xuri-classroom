// webpack module 89120 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./89460.js");
var i = require("./36610.js");
var o = require("./43696.js");
var a = "Expected a function";
var s = Math.max;
var u = Math.min;
function l(e, t, r) {
  var l;
  var c;
  var p;
  var d;
  var f;
  var g;
  var m = 0;
  var v = false;
  var y = false;
  var h = true;
  if (typeof e != "function") {
    throw new TypeError(a);
  }
  function b(t) {
    var r = l;
    var n = c;
    l = c = undefined;
    m = t;
    d = e.apply(n, r);
    return d;
  }
  function w(e) {
    m = e;
    f = setTimeout(k, t);
    if (v) {
      return b(e);
    } else {
      return d;
    }
  }
  function x(e) {
    var r = e - g;
    var n = e - m;
    var i = t - r;
    if (y) {
      return u(i, p - n);
    } else {
      return i;
    }
  }
  function E(e) {
    var r = e - g;
    var n = e - m;
    return g === undefined || r >= t || r < 0 || y && n >= p;
  }
  function k() {
    var e = i();
    if (E(e)) {
      return S(e);
    }
    f = setTimeout(k, x(e));
  }
  function S(e) {
    f = undefined;
    if (h && l) {
      return b(e);
    } else {
      l = c = undefined;
      return d;
    }
  }
  function T() {
    if (f !== undefined) {
      clearTimeout(f);
    }
    m = 0;
    l = g = c = f = undefined;
  }
  function C() {
    if (f === undefined) {
      return d;
    } else {
      return S(i());
    }
  }
  function A() {
    var e = i();
    var r = E(e);
    l = arguments;
    c = this;
    g = e;
    if (r) {
      if (f === undefined) {
        return w(g);
      }
      if (y) {
        clearTimeout(f);
        f = setTimeout(k, t);
        return b(g);
      }
    }
    if (f === undefined) {
      f = setTimeout(k, t);
    }
    return d;
  }
  t = o(t) || 0;
  if (n(r)) {
    v = !!r.leading;
    y = "maxWait" in r;
    p = y ? s(o(r.maxWait) || 0, t) : p;
    h = "trailing" in r ? !!r.trailing : h;
  }
  A.cancel = T;
  A.flush = C;
  return A;
}
module.exports = l;
};
