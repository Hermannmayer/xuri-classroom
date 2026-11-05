// webpack module 19889 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return l;
  },
  T: function () {
    return f;
  }
});
var n = require("./75728.js");
var i = require("./91613.js");
var o = require("./66439.js");
var a = require("./54101.js");
var s = require("./64209.js");
function u(e, t, r, n) {
  if (!t.length) {
    return r;
  }
  var s;
  var l = (0, a.Z)(t);
  var c = l[0];
  var p = l.slice(1);
  s = e || typeof c !== "number" ? Array.isArray(e) ? (0, o.Z)(e) : (0, i.Z)({}, e) : [];
  if (n && r === undefined && p.length === 1) {
    delete s[c][p[0]];
  } else {
    s[c] = u(s[c], p, r, n);
  }
  return s;
}
function l(e, t, r, n = false) {
  if (t.length && n && r === undefined && !(0, s.Z)(e, t.slice(0, -1))) {
    return e;
  } else {
    return u(e, t, r, n);
  }
}
function c(e) {
  return (0, n.Z)(e) === "object" && e !== null && Object.getPrototypeOf(e) === Object.prototype;
}
function p(e) {
  if (Array.isArray(e)) {
    return [];
  } else {
    return {};
  }
}
var d = typeof Reflect === "undefined" ? Object.keys : Reflect.ownKeys;
function f() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
    t[r] = arguments[r];
  }
  var i = p(t[0]);
  t.forEach(function (e) {
    function t(r, a) {
      var u = new Set(a);
      var f = (0, s.Z)(e, r);
      var g = Array.isArray(f);
      if (g || c(f)) {
        if (!u.has(f)) {
          u.add(f);
          var m = (0, s.Z)(i, r);
          if (g) {
            i = l(i, r, []);
          } else if (!m || (0, n.Z)(m) !== "object") {
            i = l(i, r, p(f));
          }
          d(f).forEach(function (e) {
            t([].concat((0, o.Z)(r), [e]), u);
          });
        }
      } else {
        i = l(i, r, f);
      }
    }
    t([]);
  });
  return i;
}
};
