// webpack module 31585 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./21487.js");
var i = require("./23874.js");
var o = require("./34256.js");
var a = require("./38399.js");
var s = a;
var u = require("./82012.js");
var l = require("./47530.js");
var c = require("./59496.js");
var p = require("./52520.js");
var d = require("./91236.js");
var f = require("./2824.js");
var g = require("./66261.js");
var m = require("./40937.js");
function v(e, t) {
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
function y(e, t) {
  var r = {};
  var n = (0, o.Z)({}, e);
  t.forEach(function (t) {
    if (e && t in e) {
      r[t] = e[t];
      delete n[t];
    }
  });
  return {
    picked: r,
    omitted: n
  };
}
var h = new RegExp(`^(${d.Y.join("|")})(-inverse)?\$`);
function b(e, t) {
  var r = e.type;
  if ((r.__ANT_BUTTON === true || e.type === "button") && e.props.disabled || r.__ANT_SWITCH === true && (e.props.disabled || e.props.loading) || r.__ANT_RADIO === true && e.props.disabled) {
    var n = y(e.props.style, ["position", "left", "right", "top", "bottom", "float", "display", "zIndex"]);
    var i = n.picked;
    var a = n.omitted;
    var u = (0, o.Z)((0, o.Z)({
      display: "inline-block"
    }, i), {
      cursor: "not-allowed",
      width: e.props.block ? "100%" : undefined
    });
    var l = (0, o.Z)((0, o.Z)({}, a), {
      pointerEvents: "none"
    });
    var p = (0, m.Tm)(e, {
      style: l,
      className: null
    });
    return c.createElement("span", {
      style: u,
      className: s(e.props.className, `${t}-disabled-compatible-wrapper`)
    }, p);
  }
  return e;
}
var w = c.forwardRef(function (e, t) {
  var r = c.useContext(p.E_);
  var a = r.getPopupContainer;
  var d = r.getPrefixCls;
  var y = r.direction;
  var w = (0, l.Z)(false, {
    value: e.open !== undefined ? e.open : e.visible,
    defaultValue: e.defaultOpen !== undefined ? e.defaultOpen : e.defaultVisible
  });
  var x = (0, i.Z)(w, 2);
  var E = x[0];
  var k = x[1];
  function S() {
    var t = e.title;
    var r = e.overlay;
    return !t && !r && t !== 0;
  }
  function T(t) {
    var r;
    var n;
    k(!S() && t);
    if (!S()) {
      if ((r = e.onOpenChange) !== null && r !== undefined) {
        r.call(e, t);
      }
      if ((n = e.onVisibleChange) !== null && n !== undefined) {
        n.call(e, t);
      }
    }
  }
  function C() {
    var t = e.builtinPlacements;
    var r = e.arrowPointAtCenter;
    var n = r !== undefined && r;
    var i = e.autoAdjustOverflow;
    var o = i === undefined || i;
    return t || (0, g.Z)({
      arrowPointAtCenter: n,
      autoAdjustOverflow: o
    });
  }
  function A(e, t) {
    var r = C();
    var n = Object.keys(r).find(function (e) {
      return r[e].points[0] === t.points?.[0] && r[e].points[1] === t.points?.[1];
    });
    if (n) {
      var i = e.getBoundingClientRect();
      var o = {
        top: "50%",
        left: "50%"
      };
      if (/top|Bottom/.test(n)) {
        o.top = `${i.height - t.offset[1]}px`;
      } else if (/Top|bottom/.test(n)) {
        o.top = `${-t.offset[1]}px`;
      }
      if (/left|Right/.test(n)) {
        o.left = `${i.width - t.offset[0]}px`;
      } else if (/right|Left/.test(n)) {
        o.left = `${-t.offset[0]}px`;
      }
      e.style.transformOrigin = `${o.left} ${o.top}`;
    }
  }
  function _() {
    var t = e.title;
    var r = e.overlay;
    if (t === 0) {
      return t;
    } else {
      return r || t || "";
    }
  }
  var O = e.getPopupContainer;
  var M = e.placement;
  var P = M === undefined ? "top" : M;
  var q = e.mouseEnterDelay;
  var N = q === undefined ? 0.1 : q;
  var R = e.mouseLeaveDelay;
  var I = R === undefined ? 0.1 : R;
  var j = v(e, ["getPopupContainer", "placement", "mouseEnterDelay", "mouseLeaveDelay"]);
  var D = e.prefixCls;
  var L = e.openClassName;
  var F = e.getTooltipContainer;
  var Z = e.overlayClassName;
  var z = e.color;
  var U = e.overlayInnerStyle;
  var B = e.children;
  var V = d("tooltip", D);
  var H = d();
  var W = E;
  if (!("open" in e) && !("visible" in e) && !!S()) {
    W = false;
  }
  var Y = b((0, m.l$)(B) && !(0, m.M2)(B) ? B : c.createElement("span", null, B), V);
  var Q = Y.props;
  var $ = Q.className && typeof Q.className !== "string" ? Q.className : s(Q.className, (0, n.Z)({}, L || `${V}-open`, true));
  var G = s(Z, (0, n.Z)((0, n.Z)({}, `${V}-rtl`, y === "rtl"), `${V}-${z}`, z && h.test(z)));
  var K = U;
  var J = {};
  if (z && !h.test(z)) {
    K = (0, o.Z)((0, o.Z)({}, U), {
      background: z
    });
    J = {
      "--antd-arrow-background-color": z
    };
  }
  return c.createElement(u.default, (0, o.Z)({}, j, {
    placement: P,
    mouseEnterDelay: N,
    mouseLeaveDelay: I,
    prefixCls: V,
    overlayClassName: G,
    getTooltipContainer: O || F || a,
    ref: t,
    builtinPlacements: C(),
    overlay: _(),
    visible: W,
    onVisibleChange: T,
    onPopupAlign: A,
    overlayInnerStyle: K,
    arrowContent: c.createElement("span", {
      className: `${V}-arrow-content`,
      style: J
    }),
    motion: {
      motionName: (0, f.mL)(H, "zoom-big-fast", e.transitionName),
      motionDeadline: 1000
    }
  }), W ? (0, m.Tm)(Y, {
    className: $
  }) : Y);
});
exports.Z = w;
};
