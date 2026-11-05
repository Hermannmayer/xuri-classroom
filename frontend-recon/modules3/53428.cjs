// webpack module 53428 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return _;
  }
});
var n = require("./34256.js");
var i = require("./75728.js");
var o = require("./21487.js");
var a = require("./23874.js");
var s = require("./69379.js");
var u = require("./38399.js");
var l = u;
var c = require("./13428.js");
var p = require("./56697.js");
var d = require("./47530.js");
var f = require("./59496.js");
var g = require("./52735.js");
var m = require("./52520.js");
var v = require("./94269.js");
var y = require("./66261.js");
var h = require("./40937.js");
var b = require("./57431.js");
var w = require("./20110.js");
var x = require("./12388.js");
var E = require("./86193.js");
var k = require("./16698.js");
function S(e, t) {
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
function T(e) {
  var t = f.useContext(m.E_);
  var r = t.getPopupContainer;
  var i = t.getPrefixCls;
  var o = t.direction;
  var s = e.prefixCls;
  var u = e.type;
  var c = u === undefined ? "default" : u;
  var p = e.danger;
  var d = e.disabled;
  var g = e.loading;
  var v = e.onClick;
  var y = e.htmlType;
  var h = e.children;
  var b = e.className;
  var T = e.menu;
  var C = e.arrow;
  var A = e.autoFocus;
  var O = e.overlay;
  var M = e.trigger;
  var P = e.align;
  var q = e.visible;
  var N = e.open;
  var R = e.onVisibleChange;
  var I = e.onOpenChange;
  var j = e.placement;
  var D = e.getPopupContainer;
  var L = e.href;
  var F = e.icon;
  var Z = F === undefined ? f.createElement(w.Z, null) : F;
  var z = e.title;
  var U = e.buttonsRender;
  var B = U === undefined ? function (e) {
    return e;
  } : U;
  var V = e.mouseEnterDelay;
  var H = e.mouseLeaveDelay;
  var W = e.overlayClassName;
  var Y = e.overlayStyle;
  var Q = e.destroyPopupOnHide;
  var $ = S(e, ["prefixCls", "type", "danger", "disabled", "loading", "onClick", "htmlType", "children", "className", "menu", "arrow", "autoFocus", "overlay", "trigger", "align", "visible", "open", "onVisibleChange", "onOpenChange", "placement", "getPopupContainer", "href", "icon", "title", "buttonsRender", "mouseEnterDelay", "mouseLeaveDelay", "overlayClassName", "overlayStyle", "destroyPopupOnHide"]);
  var G = i("dropdown-button", s);
  var K = {
    menu: T,
    arrow: C,
    autoFocus: A,
    align: P,
    disabled: d,
    trigger: d ? [] : M,
    onOpenChange: I || R,
    getPopupContainer: D || r,
    mouseEnterDelay: V,
    mouseLeaveDelay: H,
    overlayClassName: W,
    overlayStyle: Y,
    destroyPopupOnHide: Q
  };
  var J = (0, E.ri)(G, o);
  var X = J.compactSize;
  var ee = J.compactItemClassnames;
  var te = l(G, ee, b);
  if ("overlay" in e) {
    K.overlay = O;
  }
  if ("open" in e) {
    K.open = N;
  } else if ("visible" in e) {
    K.open = q;
  }
  K.placement = "placement" in e ? j : o === "rtl" ? "bottomLeft" : "bottomRight";
  var re = f.createElement(x.Z, {
    type: c,
    danger: p,
    disabled: d,
    loading: g,
    onClick: v,
    htmlType: y,
    href: L,
    title: z
  }, h);
  var ne = f.createElement(x.Z, {
    type: c,
    danger: p,
    icon: Z
  });
  var ie = B([re, ne]);
  var oe = (0, a.Z)(ie, 2);
  var ae = oe[0];
  var se = oe[1];
  return f.createElement(k.Z.Compact, (0, n.Z)({
    className: te,
    size: X,
    block: true
  }, $), ae, f.createElement(_, (0, n.Z)({}, K), se));
}
T.__ANT_BUTTON = true;
var C = T;
(0, b.b)("topLeft", "topCenter", "topRight", "bottomLeft", "bottomCenter", "bottomRight", "top", "bottom");
function A(e) {
  var t = f.useContext(m.E_);
  var r = t.getPopupContainer;
  var u = t.getPrefixCls;
  var b = t.direction;
  var w;
  function x() {
    var t = u();
    var r = e.placement;
    var n = r === undefined ? "" : r;
    var i = e.transitionName;
    if (i !== undefined) {
      return i;
    } else if (n.includes("top")) {
      return `${t}-slide-down`;
    } else {
      return `${t}-slide-up`;
    }
  }
  function k() {
    var t = e.placement;
    if (!t) {
      if (b === "rtl") {
        return "bottomRight";
      } else {
        return "bottomLeft";
      }
    }
    if (t.includes("Center")) {
      var r = t.slice(0, t.indexOf("Center"));
      return r;
    }
    return t;
  }
  var S = e.menu;
  var T = e.arrow;
  var C = e.prefixCls;
  var A = e.children;
  var _ = e.trigger;
  var O = e.disabled;
  var M = e.dropdownRender;
  var P = e.getPopupContainer;
  var q = e.overlayClassName;
  var N = e.visible;
  var R = e.open;
  var I = e.onVisibleChange;
  var j = e.onOpenChange;
  var D = e.mouseEnterDelay;
  var L = D === undefined ? 0.15 : D;
  var F = e.mouseLeaveDelay;
  var Z = F === undefined ? 0.1 : F;
  var z = e.autoAdjustOverflow;
  var U = z === undefined || z;
  var B = u("dropdown", C);
  var V = f.Children.only(A);
  var H = (0, h.Tm)(V, {
    className: l(`${B}-trigger`, (0, o.Z)({}, `${B}-rtl`, b === "rtl"), V.props.className),
    disabled: O
  });
  var W = O ? [] : _;
  if (W && W.includes("contextMenu")) {
    w = true;
  }
  var Y = (0, d.Z)(false, {
    value: R !== undefined ? R : N
  });
  var Q = (0, a.Z)(Y, 2);
  var $ = Q[0];
  var G = Q[1];
  var K = (0, p.Z)(function (e) {
    if (I !== null && I !== undefined) {
      I(e);
    }
    if (j !== null && j !== undefined) {
      j(e);
    }
    G(e);
  });
  var J = l(q, (0, o.Z)({}, `${B}-rtl`, b === "rtl"));
  var X = (0, y.Z)({
    arrowPointAtCenter: (0, i.Z)(T) === "object" && T.pointAtCenter,
    autoAdjustOverflow: U
  });
  var ee = f.useCallback(function () {
    G(false);
  }, []);
  function te() {
    var t;
    var r = e.overlay;
    t = S?.items ? f.createElement(g.Z, (0, n.Z)({}, S)) : typeof r === "function" ? r() : r;
    if (M) {
      t = M(t);
    }
    t = f.Children.only(typeof t === "string" ? f.createElement("span", null, t) : t);
    return f.createElement(v.J, {
      prefixCls: `${B}-menu`,
      expandIcon: f.createElement("span", {
        className: `${B}-menu-submenu-arrow`
      }, f.createElement(s.Z, {
        className: `${B}-menu-submenu-arrow-icon`
      })),
      mode: "vertical",
      selectable: false,
      onClick: ee,
      validator: function (e) {
        e.mode;
      }
    }, f.createElement(E.BR, null, t));
  }
  return f.createElement(c.Z, (0, n.Z)({
    alignPoint: w
  }, e, {
    mouseEnterDelay: L,
    mouseLeaveDelay: Z,
    visible: $,
    builtinPlacements: X,
    arrow: !!T,
    overlayClassName: J,
    prefixCls: B,
    getPopupContainer: P || r,
    transitionName: x(),
    trigger: W,
    overlay: te,
    placement: k(),
    onVisibleChange: K
  }), H);
}
A.Button = C;
var _ = A;
};
