// webpack module 55309 — body from webcrack
module.exports = function (module, exports, require) {
var t = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
var r = /\n/g;
var n = /^\s*/;
var i = /^(\*?[-#/*\\\w]+(\[[0-9a-z_-]+\])?)\s*/;
var o = /^:\s*/;
var a = /^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};])+)/;
var s = /^[;\s]*/;
var u = /^\s+|\s+$/g;
var l = "\n";
var c = "/";
var p = "*";
var d = "";
var f = "comment";
var g = "declaration";
function m(e) {
  if (e) {
    return e.replace(u, d);
  } else {
    return d;
  }
}
module.exports = function (e, u) {
  if (typeof e !== "string") {
    throw new TypeError("First argument must be a string");
  }
  if (!e) {
    return [];
  }
  u = u || {};
  var v = 1;
  var y = 1;
  function h(e) {
    var t = e.match(r);
    if (t) {
      v += t.length;
    }
    var n = e.lastIndexOf(l);
    y = ~n ? e.length - n : y + e.length;
  }
  function b() {
    var e = {
      line: v,
      column: y
    };
    return function (t) {
      t.position = new w(e);
      S();
      return t;
    };
  }
  function w(e) {
    this.start = e;
    this.end = {
      line: v,
      column: y
    };
    this.source = u.source;
  }
  w.prototype.content = e;
  var x = [];
  function E(t) {
    var r = new Error(u.source + ":" + v + ":" + y + ": " + t);
    r.reason = t;
    r.filename = u.source;
    r.line = v;
    r.column = y;
    r.source = e;
    if (!u.silent) {
      throw r;
    }
    x.push(r);
  }
  function k(t) {
    var r = t.exec(e);
    if (r) {
      var n = r[0];
      h(n);
      e = e.slice(n.length);
      return r;
    }
  }
  function S() {
    k(n);
  }
  function T(e) {
    var t;
    e = e || [];
    while (t = C()) {
      if (t !== false) {
        e.push(t);
      }
    }
    return e;
  }
  function C() {
    var t = b();
    if (c == e.charAt(0) && p == e.charAt(1)) {
      var r = 2;
      while (d != e.charAt(r) && (p != e.charAt(r) || c != e.charAt(r + 1))) {
        ++r;
      }
      r += 2;
      if (d === e.charAt(r - 1)) {
        return E("End of comment missing");
      }
      var n = e.slice(2, r - 2);
      y += 2;
      h(n);
      e = e.slice(r);
      y += 2;
      return t({
        type: f,
        comment: n
      });
    }
  }
  function A() {
    var e = b();
    var r = k(i);
    if (r) {
      C();
      if (!k(o)) {
        return E("property missing ':'");
      }
      var n = k(a);
      var u = e({
        type: g,
        property: m(r[0].replace(t, d)),
        value: n ? m(n[0].replace(t, d)) : d
      });
      k(s);
      return u;
    }
  }
  function _() {
    var e;
    var t = [];
    T(t);
    while (e = A()) {
      if (e !== false) {
        t.push(e);
        T(t);
      }
    }
    return t;
  }
  S();
  return _();
};
};
