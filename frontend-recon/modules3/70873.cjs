// webpack module 70873 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = c;
exports.merge = g;
var i = n(require("./28004.js"));
var o = n(require("./38524.js"));
var a = n(require("./72408.js"));
var s = n(require("./56203.js"));
var u = n(require("./75333.js"));
function l(e, t, r, n) {
  if (!t.length) {
    return r;
  }
  var i;
  var u = (0, s.default)(t);
  var c = u[0];
  var p = u.slice(1);
  i = e || typeof c !== "number" ? Array.isArray(e) ? (0, a.default)(e) : (0, o.default)({}, e) : [];
  if (n && r === undefined && p.length === 1) {
    delete i[c][p[0]];
  } else {
    i[c] = l(i[c], p, r, n);
  }
  return i;
}
function c(e, t, r, n = false) {
  if (t.length && n && r === undefined && !(0, u.default)(e, t.slice(0, -1))) {
    return e;
  } else {
    return l(e, t, r, n);
  }
}
function p(e) {
  return (0, i.default)(e) === "object" && e !== null && Object.getPrototypeOf(e) === Object.prototype;
}
function d(e) {
  if (Array.isArray(e)) {
    return [];
  } else {
    return {};
  }
}
var f = typeof Reflect === "undefined" ? Object.keys : Reflect.ownKeys;
function g() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
    t[r] = arguments[r];
  }
  var n = d(t[0]);
  t.forEach(function (e) {
    function t(r, o) {
      var s = new Set(o);
      var l = (0, u.default)(e, r);
      var g = Array.isArray(l);
      if (g || p(l)) {
        if (!s.has(l)) {
          s.add(l);
          var m = (0, u.default)(n, r);
          if (g) {
            n = c(n, r, []);
          } else if (!m || (0, i.default)(m) !== "object") {
            n = c(n, r, d(l));
          }
          f(l).forEach(function (e) {
            t([].concat((0, a.default)(r), [e]), s);
          });
        }
      } else {
        n = c(n, r, l);
      }
    }
    t([]);
  });
  return n;
}
};
