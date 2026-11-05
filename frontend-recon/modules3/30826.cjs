// webpack module 30826 — body from webcrack
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
  function w(e) {
    var r = e - l;
    var n = e - c;
    return l === undefined || r >= t || r < 0 || d && n >= a;
  }
  function E() {
    var e = h();
    if (w(e)) {
      return k(e);
    }
    u = setTimeout(E, b(e));
  }
  function k(e) {
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
      return k(h());
    }
  }
  function A() {
    var e = h();
    var r = w(e);
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
  t = S(t) || 0;
  if (x(r)) {
    p = !!r.leading;
    d = "maxWait" in r;
    a = d ? v(S(r.maxWait) || 0, t) : a;
    f = "trailing" in r ? !!r.trailing : f;
  }
  A.cancel = T;
  A.flush = C;
  return A;
}
function w(e, t, r) {
  var i = true;
  var o = true;
  if (typeof e != "function") {
    throw new TypeError(n);
  }
  if (x(r)) {
    i = "leading" in r ? !!r.leading : i;
    o = "trailing" in r ? !!r.trailing : o;
  }
  return b(e, t, {
    leading: i,
    maxWait: t,
    trailing: o
  });
}
function x(e) {
  var t = typeof e;
  return !!e && (t == "object" || t == "function");
}
function E(e) {
  return !!e && typeof e == "object";
}
function k(e) {
  return typeof e == "symbol" || E(e) && m.call(e) == o;
}
function S(e) {
  if (typeof e == "number") {
    return e;
  }
  if (k(e)) {
    return i;
  }
  if (x(e)) {
    var t = typeof e.valueOf == "function" ? e.valueOf() : e;
    e = x(t) ? t + "" : t;
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
module.exports = w;
};
