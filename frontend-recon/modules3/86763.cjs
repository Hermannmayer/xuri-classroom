// webpack module 86763 — body from webcrack
module.exports = function (module, exports, require) {
var n = "Expected a function";
var i = NaN;
var o = "[object Symbol]";
var a = /^\s+|\s+$/g;
var s = /^[-+]0x[0-9a-f]+$/i;
var u = /^0b[01]+$/i;
var l = /^0o[0-7]+$/i;
var c = parseInt;
var p = typeof require.g == "object" && require.g && require.g.Object === Object && require.g;
var d = typeof self == "object" && self && self.Object === Object && self;
var f = p || d || Function("return this")();
var g = Object.prototype;
var m = g.toString;
var v = Math.max;
var y = Math.min;
function h() {
  return f.Date.now();
}
function b(e, t, r) {
  var i;
  var o;
  var a;
  var s;
  var u;
  var l;
  var c = 0;
  var p = false;
  var d = false;
  var f = true;
  if (typeof e != "function") {
    throw new TypeError(n);
  }
  function g(t) {
    var r = i;
    var n = o;
    i = o = undefined;
    c = t;
    s = e.apply(n, r);
    return s;
  }
  function m(e) {
    c = e;
    u = setTimeout(E, t);
    if (p) {
      return g(e);
    } else {
      return s;
    }
  }
  function b(e) {
    var r = e - l;
    var n = e - c;
    var i = t - r;
    if (d) {
      return y(i, a - n);
    } else {
      return i;
    }
  }
  function x(e) {
    var r = e - l;
    var n = e - c;
    return l === undefined || r >= t || r < 0 || d && n >= a;
  }
  function E() {
    var e = h();
    if (x(e)) {
      return S(e);
    }
    u = setTimeout(E, b(e));
  }
  function S(e) {
    u = undefined;
    if (f && i) {
      return g(e);
    } else {
      i = o = undefined;
      return s;
    }
  }
  function T() {
    if (u !== undefined) {
      clearTimeout(u);
    }
    c = 0;
    i = l = o = u = undefined;
  }
  function C() {
    if (u === undefined) {
      return s;
    } else {
      return S(h());
    }
  }
  function A() {
    var e = h();
    var r = x(e);
    i = arguments;
    o = this;
    l = e;
    if (r) {
      if (u === undefined) {
        return m(l);
      }
      if (d) {
        u = setTimeout(E, t);
        return g(l);
      }
    }
    if (u === undefined) {
      u = setTimeout(E, t);
    }
    return s;
  }
  t = k(t) || 0;
  if (w(r)) {
    p = !!r.leading;
    d = "maxWait" in r;
    a = d ? v(k(r.maxWait) || 0, t) : a;
    f = "trailing" in r ? !!r.trailing : f;
  }
  A.cancel = T;
  A.flush = C;
  return A;
}
function w(e) {
  var t = typeof e;
  return !!e && (t == "object" || t == "function");
}
function x(e) {
  return !!e && typeof e == "object";
}
function E(e) {
  return typeof e == "symbol" || x(e) && m.call(e) == o;
}
function k(e) {
  if (typeof e == "number") {
    return e;
  }
  if (E(e)) {
    return i;
  }
  if (w(e)) {
    var t = typeof e.valueOf == "function" ? e.valueOf() : e;
    e = w(t) ? t + "" : t;
  }
  if (typeof e != "string") {
    if (e === 0) {
      return e;
    } else {
      return +e;
    }
  }
  e = e.replace(a, "");
  var r = u.test(e);
  if (r || l.test(e)) {
    return c(e.slice(2), r ? 2 : 8);
  } else if (s.test(e)) {
    return i;
  } else {
    return +e;
  }
}
module.exports = b;
};
