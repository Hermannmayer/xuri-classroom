// webpack module 16698 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  u: function () {
    return m;
  },
  Z: function () {
    return w;
  }
});
var n = require("./34256.js");
var i = require("./21487.js");
var o = require("./23874.js");
var a = require("./38399.js");
var s = a;
var u = require("./3787.js");
var l = require("./59496.js");
var c = require("./52520.js");
var p = require("./79369.js");
function d(e) {
  var t = e.className;
  var r = e.direction;
  var o = e.index;
  var a = e.marginDirection;
  var s = e.children;
  var u = e.split;
  var c = e.wrap;
  var p = l.useContext(m);
  var d = p.horizontalSize;
  var f = p.verticalSize;
  var g = p.latestIndex;
  var v = p.supportFlexGap;
  var y = {};
  if (!v) {
    if (r === "vertical") {
      if (o < g) {
        y = {
          marginBottom: d / (u ? 2 : 1)
        };
      }
    } else {
      y = (0, n.Z)((0, n.Z)({}, o < g && (0, i.Z)({}, a, d / (u ? 2 : 1))), c && {
        paddingBottom: f
      });
    }
  }
  if (s === null || s === undefined) {
    return null;
  } else {
    return l.createElement(l.Fragment, null, l.createElement("div", {
      className: t,
      style: y
    }, s), o < g && u && l.createElement("span", {
      className: `${t}-split`,
      style: y
    }, u));
  }
}
var f = require("./86193.js");
function g(e, t) {
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
var m = l.createContext({
  latestIndex: 0,
  horizontalSize: 0,
  verticalSize: 0,
  supportFlexGap: false
});
var v = {
  small: 8,
  middle: 16,
  large: 24
};
function y(e) {
  if (typeof e === "string") {
    return v[e];
  } else {
    return e || 0;
  }
}
function h(e) {
  var t = l.useContext(c.E_);
  var r = t.getPrefixCls;
  var a = t.space;
  var f = t.direction;
  var v = e.size;
  var h = v === undefined ? a?.size || "small" : v;
  var b = e.align;
  var w = e.className;
  var x = e.children;
  var E = e.direction;
  var k = E === undefined ? "horizontal" : E;
  var S = e.prefixCls;
  var T = e.split;
  var C = e.style;
  var A = e.wrap;
  var _ = A !== undefined && A;
  var O = g(e, ["size", "align", "className", "children", "direction", "prefixCls", "split", "style", "wrap"]);
  var M = (0, p.Z)();
  var P = l.useMemo(function () {
    return (Array.isArray(h) ? h : [h, h]).map(function (e) {
      return y(e);
    });
  }, [h]);
  var q = (0, o.Z)(P, 2);
  var N = q[0];
  var R = q[1];
  var I = (0, u.Z)(x, {
    keepEmpty: true
  });
  var j = b === undefined && k === "horizontal" ? "center" : b;
  var D = r("space", S);
  var L = s(D, `${D}-${k}`, (0, i.Z)((0, i.Z)({}, `${D}-rtl`, f === "rtl"), `${D}-align-${j}`, j), w);
  var F = `${D}-item`;
  var Z = f === "rtl" ? "marginLeft" : "marginRight";
  var z = 0;
  var U = I.map(function (e, t) {
    if (e !== null && e !== undefined) {
      z = t;
    }
    var r = e && e.key || `${F}-${t}`;
    return l.createElement(d, {
      className: F,
      key: r,
      direction: k,
      index: t,
      marginDirection: Z,
      split: T,
      wrap: _
    }, e);
  });
  var B = l.useMemo(function () {
    return {
      horizontalSize: N,
      verticalSize: R,
      latestIndex: z,
      supportFlexGap: M
    };
  }, [N, R, z, M]);
  if (I.length === 0) {
    return null;
  }
  var V = {};
  if (_) {
    V.flexWrap = "wrap";
    if (!M) {
      V.marginBottom = -R;
    }
  }
  if (M) {
    V.columnGap = N;
    V.rowGap = R;
  }
  return l.createElement("div", (0, n.Z)({
    className: L,
    style: (0, n.Z)((0, n.Z)({}, V), C)
  }, O), l.createElement(m.Provider, {
    value: B
  }, U));
}
var b = h;
b.Compact = f.ZP;
var w = b;
};
