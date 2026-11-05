// webpack module 61727 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useLocaleReceiver = exports.default = undefined;
var o = i(require("./90585.js"));
var a = n(require("./59496.js"));
var s = i(require("./85020.js"));
var u = i(require("./2905.js"));
function l(e) {
  var t = e.componentName;
  var r = t === undefined ? "global" : t;
  var n = e.defaultLocale;
  var i = e.children;
  var l = a.useContext(s.default);
  var c = a.useMemo(function () {
    var t = n || u.default[r];
    var i = l?.[r] ?? {};
    return (0, o.default)((0, o.default)({}, t instanceof Function ? t() : t), i || {});
  }, [r, n, l]);
  var p = a.useMemo(function () {
    var e = l && l.locale;
    if (l && l.exist && !e) {
      return u.default.locale;
    } else {
      return e;
    }
  }, [l]);
  return i(c, p, l);
}
exports.default = l;
exports.useLocaleReceiver = function (e, t) {
  var r = a.useContext(s.default);
  var n = a.useMemo(function () {
    var i = t || u.default[e];
    var a = r?.[e] ?? {};
    return (0, o.default)((0, o.default)({}, typeof i === "function" ? i() : i), a || {});
  }, [e, t, r]);
  return [n];
};
};
