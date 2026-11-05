// webpack module 19486 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return l;
  },
  E: function () {
    return c;
  }
});
var n = require("./34256.js");
var i = require("./59496.js");
var o = require("./81454.js");
var a = require("./54502.js");
var s = a.Z;
function u(e) {
  var t = e.componentName;
  var r = t === undefined ? "global" : t;
  var a = e.defaultLocale;
  var u = e.children;
  var l = i.useContext(o.Z);
  var c = i.useMemo(function () {
    var t = a || s[r];
    var i = l?.[r] ?? {};
    return (0, n.Z)((0, n.Z)({}, t instanceof Function ? t() : t), i || {});
  }, [r, a, l]);
  var p = i.useMemo(function () {
    var e = l && l.locale;
    if (l && l.exist && !e) {
      return s.locale;
    } else {
      return e;
    }
  }, [l]);
  return u(c, p, l);
}
var l = u;
function c(e, t) {
  var r = i.useContext(o.Z);
  var a = i.useMemo(function () {
    var o = t || s[e];
    var a = r?.[e] ?? {};
    return (0, n.Z)((0, n.Z)({}, typeof o === "function" ? o() : o), a || {});
  }, [e, t, r]);
  return [a];
}
};
