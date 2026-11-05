// webpack module 72070 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./72354.js");
var i = require("./79456.js");
var o = require("./41630.js");
var a = require("./4484.js");
var s = require("./78426.js");
var u = require("./61230.js");
var l = require("./43379.js");
var c = require("./62190.js");
var p = Math.max;
var d = Math.min;
var f = Math.floor;
var g = /\$([$&'`]|\d\d?|<[^>]*>)/g;
var m = /\$([$&'`]|\d\d?)/g;
function v(e) {
  if (e === undefined) {
    return e;
  } else {
    return String(e);
  }
}
n("replace", 2, function (e, t, r, n) {
  var y = n.REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE;
  var h = n.REPLACE_KEEPS_$0;
  var b = y ? "$" : "$0";
  return [function (r, n) {
    var i = u(this);
    var o = r == undefined ? undefined : r[e];
    if (o !== undefined) {
      return o.call(r, i, n);
    } else {
      return t.call(String(i), r, n);
    }
  }, function (e, n) {
    if (!y && h || typeof n === "string" && n.indexOf(b) === -1) {
      var o = r(t, e, this, n);
      if (o.done) {
        return o.value;
      }
    }
    var u = i(e);
    var f = String(this);
    var g = typeof n === "function";
    if (!g) {
      n = String(n);
    }
    var m = u.global;
    if (m) {
      var x = u.unicode;
      u.lastIndex = 0;
    }
    var E = [];
    while (1) {
      var k = c(u, f);
      if (k === null) {
        break;
      }
      E.push(k);
      if (!m) {
        break;
      }
      var S = String(k[0]);
      if (S === "") {
        u.lastIndex = l(f, a(u.lastIndex), x);
      }
    }
    var T = "";
    var C = 0;
    for (var A = 0; A < E.length; A++) {
      k = E[A];
      var _ = String(k[0]);
      var O = p(d(s(k.index), f.length), 0);
      var M = [];
      for (var P = 1; P < k.length; P++) {
        M.push(v(k[P]));
      }
      var q = k.groups;
      if (g) {
        var N = [_].concat(M, O, f);
        if (q !== undefined) {
          N.push(q);
        }
        var R = String(n.apply(undefined, N));
      } else {
        R = w(_, f, O, M, q, n);
      }
      if (O >= C) {
        T += f.slice(C, O) + R;
        C = O + _.length;
      }
    }
    return T + f.slice(C);
  }];
  function w(e, r, n, i, a, s) {
    var u = n + e.length;
    var l = i.length;
    var c = m;
    if (a !== undefined) {
      a = o(a);
      c = g;
    }
    return t.call(s, c, function (t, o) {
      var s;
      switch (o.charAt(0)) {
        case "$":
          return "$";
        case "&":
          return e;
        case "`":
          return r.slice(0, n);
        case "'":
          return r.slice(u);
        case "<":
          s = a[o.slice(1, -1)];
          break;
        default:
          var c = +o;
          if (c === 0) {
            return t;
          }
          if (c > l) {
            var p = f(c / 10);
            if (p === 0) {
              return t;
            } else if (p <= l) {
              if (i[p - 1] === undefined) {
                return o.charAt(1);
              } else {
                return i[p - 1] + o.charAt(1);
              }
            } else {
              return t;
            }
          }
          s = i[c - 1];
      }
      if (s === undefined) {
        return "";
      } else {
        return s;
      }
    });
  }
});
};
