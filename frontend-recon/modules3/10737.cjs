// webpack module 10737 — body from webcrack
module.exports = function (module, exports, require) {
var t = 2147483647;
var r = 36;
var n = 1;
var i = 26;
var o = 38;
var a = 700;
var s = 72;
var u = 128;
var l = "-";
var c = /[^\0-\u007E]/;
var p = /[.\u3002\uFF0E\uFF61]/g;
var d = "Overflow: input needs wider integers to process";
var f = r - n;
var g = Math.floor;
var m = String.fromCharCode;
function v(e) {
  var t = [];
  var r = 0;
  var n = e.length;
  while (r < n) {
    var i = e.charCodeAt(r++);
    if (i >= 55296 && i <= 56319 && r < n) {
      var o = e.charCodeAt(r++);
      if ((o & 64512) == 56320) {
        t.push(((i & 1023) << 10) + (o & 1023) + 65536);
      } else {
        t.push(i);
        r--;
      }
    } else {
      t.push(i);
    }
  }
  return t;
}
function y(e) {
  return e + 22 + (e < 26) * 75;
}
function h(e, t, n) {
  var s = 0;
  e = n ? g(e / a) : e >> 1;
  e += g(e / t);
  for (; e > f * i >> 1; s += r) {
    e = g(e / f);
  }
  return g(s + (f + 1) * e / (e + o));
}
function b(e) {
  var o = [];
  e = v(e);
  var a;
  var c;
  var p = e.length;
  var f = u;
  var b = 0;
  var w = s;
  for (a = 0; a < e.length; a++) {
    c = e[a];
    if (c < 128) {
      o.push(m(c));
    }
  }
  var x = o.length;
  var E = x;
  if (x) {
    o.push(l);
  }
  while (E < p) {
    var k = t;
    for (a = 0; a < e.length; a++) {
      c = e[a];
      if (c >= f && c < k) {
        k = c;
      }
    }
    var S = E + 1;
    if (k - f > g((t - b) / S)) {
      throw RangeError(d);
    }
    b += (k - f) * S;
    f = k;
    a = 0;
    for (; a < e.length; a++) {
      c = e[a];
      if (c < f && ++b > t) {
        throw RangeError(d);
      }
      if (c == f) {
        var T = b;
        for (var C = r;; C += r) {
          var A = C <= w ? n : C >= w + i ? i : C - w;
          if (T < A) {
            break;
          }
          var _ = T - A;
          var O = r - A;
          o.push(m(y(A + _ % O)));
          T = g(_ / O);
        }
        o.push(m(y(T)));
        w = h(b, S, E == x);
        b = 0;
        ++E;
      }
    }
    ++b;
    ++f;
  }
  return o.join("");
}
module.exports = function (e) {
  var t;
  var r;
  var n = [];
  var i = e.toLowerCase().replace(p, ".").split(".");
  for (t = 0; t < i.length; t++) {
    r = i[t];
    n.push(c.test(r) ? "xn--" + b(r) : r);
  }
  return n.join(".");
};
};
