// webpack module 44624 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useCompactItemContext = exports.default = exports.SpaceCompactItemContext = exports.NoCompactStyle = undefined;
var o = i(require("./90585.js"));
var a = i(require("./14389.js"));
var s = i(require("./38399.js"));
var u = i(require("./22771.js"));
var l = n(require("./59496.js"));
var c = require("./96583.js");
function p(e, t) {
  var r = {};
  for (var n in e) {
    if (Object.prototype.hasOwnProperty.call(e, n) && t.indexOf(n) < 0) {
      r[n] = e[n];
    }
  }
  if (e != null && typeof Object.getOwnPropertySymbols === "function") {
    var i = 0;
    for (n = Object.getOwnPropertySymbols(e); i < n.length; i++) {
      if (t.indexOf(n[i]) < 0 && Object.prototype.propertyIsEnumerable.call(e, n[i])) {
        r[n[i]] = e[n[i]];
      }
    }
  }
  return r;
}
var d = exports.SpaceCompactItemContext = l.createContext(null);
exports.useCompactItemContext = function (e, t) {
  var r = l.useContext(d);
  var n = l.useMemo(function () {
    if (!r) {
      return "";
    }
    var n = r.compactDirection;
    var i = r.isFirstItem;
    var o = r.isLastItem;
    var u = n === "vertical" ? "-vertical-" : "-";
    return (0, s.default)((0, a.default)((0, a.default)((0, a.default)((0, a.default)({}, `${e}-compact${u}item`, true), `${e}-compact${u}first-item`, i), `${e}-compact${u}last-item`, o), `${e}-compact${u}item-rtl`, t === "rtl"));
  }, [e, t, r]);
  return {
    compactSize: r?.compactSize,
    compactDirection: r?.compactDirection,
    compactItemClassnames: n
  };
};
exports.NoCompactStyle = function (e) {
  var t = e.children;
  return l.createElement(d.Provider, {
    value: null
  }, t);
};
function f(e) {
  var t = e.children;
  var r = p(e, ["children"]);
  return l.createElement(d.Provider, {
    value: r
  }, t);
}
function g(e) {
  var t = l.useContext(c.ConfigContext);
  var r = t.getPrefixCls;
  var n = t.direction;
  var i = e.size;
  var g = i === undefined ? "middle" : i;
  var m = e.direction;
  var v = e.block;
  var y = e.prefixCls;
  var h = e.className;
  var b = e.children;
  var w = p(e, ["size", "direction", "block", "prefixCls", "className", "children"]);
  var x = r("space-compact", y);
  var E = (0, s.default)(x, (0, a.default)((0, a.default)((0, a.default)({}, `${x}-rtl`, n === "rtl"), `${x}-block`, v), `${x}-vertical`, m === "vertical"), h);
  var k = l.useContext(d);
  var S = (0, u.default)(b);
  var T = l.useMemo(function () {
    return S.map(function (e, t) {
      var r = e && e.key || `${x}-item-${t}`;
      return l.createElement(f, {
        key: r,
        compactSize: g,
        compactDirection: m,
        isFirstItem: t === 0 && (!k || k?.isFirstItem),
        isLastItem: t === S.length - 1 && (!k || k?.isLastItem)
      }, e);
    });
  }, [g, S, k]);
  if (S.length === 0) {
    return null;
  } else {
    return l.createElement("div", (0, o.default)({
      className: E
    }, w), T);
  }
}
exports.default = g;
};
