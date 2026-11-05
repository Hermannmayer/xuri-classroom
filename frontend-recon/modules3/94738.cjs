// webpack module 94738 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  D: function () {
    return S;
  },
  Z: function () {
    return A;
  }
});
var n = require("./21487.js");
var i = require("./34256.js");
var o = require("./23874.js");
var a = require("./91613.js");
var s = require("./59496.js");
var u = require("./61042.js");
var l = require("./18268.js");
function c(e, t) {
  return s.createElement(l.Z, (0, a.Z)((0, a.Z)({}, e), {}, {
    ref: t,
    icon: u.Z
  }));
}
var p = s.forwardRef(c);
var d = p;
var f = require("./51770.js");
var g = require("./69379.js");
var m = require("./38399.js");
var v = m;
var y = require("./91842.js");
var h = require("./52520.js");
function b(e) {
  return !isNaN(parseFloat(e)) && isFinite(e);
}
var w = b;
var x = require("./77333.js");
function E(e, t) {
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
var k = {
  xs: "479.98px",
  sm: "575.98px",
  md: "767.98px",
  lg: "991.98px",
  xl: "1199.98px",
  xxl: "1599.98px"
};
var S = s.createContext({});
var T = function () {
  var e = 0;
  return function (t = "") {
    e += 1;
    return `${t}${e}`;
  };
}();
var C = s.forwardRef(function (e, t) {
  var r = e.prefixCls;
  var a = e.className;
  var u = e.trigger;
  var l = e.children;
  var c = e.defaultCollapsed;
  var p = c !== undefined && c;
  var m = e.theme;
  var b = m === undefined ? "dark" : m;
  var C = e.style;
  var A = C === undefined ? {} : C;
  var _ = e.collapsible;
  var O = _ !== undefined && _;
  var M = e.reverseArrow;
  var P = M !== undefined && M;
  var q = e.width;
  var N = q === undefined ? 200 : q;
  var R = e.collapsedWidth;
  var I = R === undefined ? 80 : R;
  var j = e.zeroWidthTriggerStyle;
  var D = e.breakpoint;
  var L = e.onCollapse;
  var F = e.onBreakpoint;
  var Z = E(e, ["prefixCls", "className", "trigger", "children", "defaultCollapsed", "theme", "style", "collapsible", "reverseArrow", "width", "collapsedWidth", "zeroWidthTriggerStyle", "breakpoint", "onCollapse", "onBreakpoint"]);
  var z = (0, s.useContext)(x.Gs);
  var U = z.siderHook;
  var B = (0, s.useState)("collapsed" in Z ? Z.collapsed : p);
  var V = (0, o.Z)(B, 2);
  var H = V[0];
  var W = V[1];
  var Y = (0, s.useState)(false);
  var Q = (0, o.Z)(Y, 2);
  var $ = Q[0];
  var G = Q[1];
  (0, s.useEffect)(function () {
    if ("collapsed" in Z) {
      W(Z.collapsed);
    }
  }, [Z.collapsed]);
  function K(e, t) {
    if (!("collapsed" in Z)) {
      W(e);
    }
    if (L !== null && L !== undefined) {
      L(e, t);
    }
  }
  var J = (0, s.useRef)();
  J.current = function (e) {
    G(e.matches);
    if (F !== null && F !== undefined) {
      F(e.matches);
    }
    if (H !== e.matches) {
      K(e.matches, "responsive");
    }
  };
  (0, s.useEffect)(function () {
    function e(e) {
      return J.current(e);
    }
    var t;
    if (typeof window !== "undefined") {
      var r = window;
      var n = r.matchMedia;
      if (n && D && D in k) {
        t = n(`(max-width: ${k[D]})`);
        try {
          t.addEventListener("change", e);
        } catch (i) {
          t.addListener(e);
        }
        e(t);
      }
    }
    return function () {
      try {
        if (t !== null && t !== undefined) {
          t.removeEventListener("change", e);
        }
      } catch (i) {
        if (t !== null && t !== undefined) {
          t.removeListener(e);
        }
      }
    };
  }, [D]);
  (0, s.useEffect)(function () {
    var e = T("ant-sider-");
    U.addSider(e);
    return function () {
      return U.removeSider(e);
    };
  }, []);
  function X() {
    K(!H, "clickTrigger");
  }
  var ee = (0, s.useContext)(h.E_);
  var te = ee.getPrefixCls;
  function re() {
    var e = te("layout-sider", r);
    var o = (0, y.Z)(Z, ["collapsed"]);
    var c = H ? I : N;
    var p = w(c) ? `${c}px` : String(c);
    var m = parseFloat(String(I || 0)) === 0 ? s.createElement("span", {
      onClick: X,
      className: v(`${e}-zero-width-trigger`, `${e}-zero-width-trigger-${P ? "right" : "left"}`),
      style: j
    }, u || s.createElement(d, null)) : null;
    var h = {
      expanded: P ? s.createElement(g.Z, null) : s.createElement(f.Z, null),
      collapsed: P ? s.createElement(f.Z, null) : s.createElement(g.Z, null)
    };
    var x = H ? "collapsed" : "expanded";
    var E = h[x];
    var k = u !== null ? m || s.createElement("div", {
      className: `${e}-trigger`,
      onClick: X,
      style: {
        width: p
      }
    }, u || E) : null;
    var S = (0, i.Z)((0, i.Z)({}, A), {
      flex: `0 0 ${p}`,
      maxWidth: p,
      minWidth: p,
      width: p
    });
    var T = v(e, `${e}-${b}`, (0, n.Z)((0, n.Z)((0, n.Z)((0, n.Z)({}, `${e}-collapsed`, !!H), `${e}-has-trigger`, O && u !== null && !m), `${e}-below`, !!$), `${e}-zero-width`, parseFloat(p) === 0), a);
    return s.createElement("aside", (0, i.Z)({
      className: T
    }, o, {
      style: S,
      ref: t
    }), s.createElement("div", {
      className: `${e}-children`
    }, l), O || $ && m ? k : null);
  }
  var ne = s.useMemo(function () {
    return {
      siderCollapsed: H
    };
  }, [H]);
  return s.createElement(S.Provider, {
    value: ne
  }, re());
});
var A = C;
};
