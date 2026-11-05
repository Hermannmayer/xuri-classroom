// webpack module 86601 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./72354.js");
var i = require("./86930.js");
var o = require("./79456.js");
var a = require("./61230.js");
var s = require("./51052.js");
var u = require("./43379.js");
var l = require("./4484.js");
var c = require("./62190.js");
var p = require("./8801.js");
var d = require("./27015.js");
var f = [].push;
var g = Math.min;
var m = 4294967295;
var v = !d(function () {
  return !RegExp(m, "y");
});
n("split", 2, function (e, t, r) {
  var n;
  n = "abbc".split(/(b)*/)[1] == "c" || "test".split(/(?:)/, -1).length != 4 || "ab".split(/(?:ab)*/).length != 2 || ".".split(/(.?)(.?)/).length != 4 || ".".split(/()()/).length > 1 || "".split(/.?/).length ? function (e, r) {
    var n = String(a(this));
    var o = r === undefined ? m : r >>> 0;
    if (o === 0) {
      return [];
    }
    if (e === undefined) {
      return [n];
    }
    if (!i(e)) {
      return t.call(n, e, o);
    }
    var s;
    var u;
    var l;
    var c = [];
    var d = (e.ignoreCase ? "i" : "") + (e.multiline ? "m" : "") + (e.unicode ? "u" : "") + (e.sticky ? "y" : "");
    var g = 0;
    var v = new RegExp(e.source, d + "g");
    while (s = p.call(v, n)) {
      u = v.lastIndex;
      if (u > g && (c.push(n.slice(g, s.index)), s.length > 1 && s.index < n.length && f.apply(c, s.slice(1)), l = s[0].length, g = u, c.length >= o)) {
        break;
      }
      if (v.lastIndex === s.index) {
        v.lastIndex++;
      }
    }
    if (g === n.length) {
      if (!!l || !v.test("")) {
        c.push("");
      }
    } else {
      c.push(n.slice(g));
    }
    if (c.length > o) {
      return c.slice(0, o);
    } else {
      return c;
    }
  } : "0".split(undefined, 0).length ? function (e, r) {
    if (e === undefined && r === 0) {
      return [];
    } else {
      return t.call(this, e, r);
    }
  } : t;
  return [function (t, r) {
    var i = a(this);
    var o = t == undefined ? undefined : t[e];
    if (o !== undefined) {
      return o.call(t, i, r);
    } else {
      return n.call(String(i), t, r);
    }
  }, function (e, i) {
    var a = r(n, e, this, i, n !== t);
    if (a.done) {
      return a.value;
    }
    var p = o(e);
    var d = String(this);
    var f = s(p, RegExp);
    var y = p.unicode;
    var h = (p.ignoreCase ? "i" : "") + (p.multiline ? "m" : "") + (p.unicode ? "u" : "") + (v ? "y" : "g");
    var b = new f(v ? p : "^(?:" + p.source + ")", h);
    var w = i === undefined ? m : i >>> 0;
    if (w === 0) {
      return [];
    }
    if (d.length === 0) {
      if (c(b, d) === null) {
        return [d];
      } else {
        return [];
      }
    }
    var x = 0;
    var E = 0;
    var k = [];
    while (E < d.length) {
      b.lastIndex = v ? E : 0;
      var S;
      var T = c(b, v ? d : d.slice(E));
      if (T === null || (S = g(l(b.lastIndex + (v ? 0 : E)), d.length)) === x) {
        E = u(d, E, y);
      } else {
        k.push(d.slice(x, E));
        if (k.length === w) {
          return k;
        }
        for (var C = 1; C <= T.length - 1; C++) {
          k.push(T[C]);
          if (k.length === w) {
            return k;
          }
        }
        E = x = S;
      }
    }
    k.push(d.slice(x));
    return k;
  }];
}, !v);
};
