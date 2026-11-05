// webpack module 86193 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  ri: function () {
    return d;
  },
  BR: function () {
    return f;
  }
});
var n = require("./34256.js");
var i = require("./21487.js");
var o = require("./38399.js");
var a = o;
var s = require("./3787.js");
var u = require("./59496.js");
var l = require("./52520.js");
function c(e, t) {
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
var p = u.createContext(null);
function d(e, t) {
  var r = u.useContext(p);
  var n = u.useMemo(function () {
    if (!r) {
      return "";
    }
    var n = r.compactDirection;
    var o = r.isFirstItem;
    var s = r.isLastItem;
    var u = n === "vertical" ? "-vertical-" : "-";
    return a((0, i.Z)((0, i.Z)((0, i.Z)((0, i.Z)({}, `${e}-compact${u}item`, true), `${e}-compact${u}first-item`, o), `${e}-compact${u}last-item`, s), `${e}-compact${u}item-rtl`, t === "rtl"));
  }, [e, t, r]);
  return {
    compactSize: r?.compactSize,
    compactDirection: r?.compactDirection,
    compactItemClassnames: n
  };
}
function f(e) {
  var t = e.children;
  return u.createElement(p.Provider, {
    value: null
  }, t);
}
function g(e) {
  var t = e.children;
  var r = c(e, ["children"]);
  return u.createElement(p.Provider, {
    value: r
  }, t);
}
function m(e) {
  var t = u.useContext(l.E_);
  var r = t.getPrefixCls;
  var o = t.direction;
  var d = e.size;
  var f = d === undefined ? "middle" : d;
  var m = e.direction;
  var v = e.block;
  var y = e.prefixCls;
  var h = e.className;
  var b = e.children;
  var w = c(e, ["size", "direction", "block", "prefixCls", "className", "children"]);
  var x = r("space-compact", y);
  var E = a(x, (0, i.Z)((0, i.Z)((0, i.Z)({}, `${x}-rtl`, o === "rtl"), `${x}-block`, v), `${x}-vertical`, m === "vertical"), h);
  var k = u.useContext(p);
  var S = (0, s.Z)(b);
  var T = u.useMemo(function () {
    return S.map(function (e, t) {
      var r = e && e.key || `${x}-item-${t}`;
      return u.createElement(g, {
        key: r,
        compactSize: f,
        compactDirection: m,
        isFirstItem: t === 0 && (!k || k?.isFirstItem),
        isLastItem: t === S.length - 1 && (!k || k?.isLastItem)
      }, e);
    });
  }, [f, S, k]);
  if (S.length === 0) {
    return null;
  } else {
    return u.createElement("div", (0, n.Z)({
      className: E
    }, w), T);
  }
}
exports.ZP = m;
};
