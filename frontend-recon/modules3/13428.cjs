// webpack module 13428 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return S;
  }
});
var n = require("./21487.js");
var i = require("./91613.js");
var o = require("./23874.js");
var a = require("./37913.js");
var s = require("./59496.js");
var u = require("./8019.js");
var l = require("./38399.js");
var c = l;
var p = {
  adjustX: 1,
  adjustY: 1
};
var d = [0, 0];
var f = {
  topLeft: {
    points: ["bl", "tl"],
    overflow: p,
    offset: [0, -4],
    targetOffset: d
  },
  topCenter: {
    points: ["bc", "tc"],
    overflow: p,
    offset: [0, -4],
    targetOffset: d
  },
  topRight: {
    points: ["br", "tr"],
    overflow: p,
    offset: [0, -4],
    targetOffset: d
  },
  bottomLeft: {
    points: ["tl", "bl"],
    overflow: p,
    offset: [0, 4],
    targetOffset: d
  },
  bottomCenter: {
    points: ["tc", "bc"],
    overflow: p,
    offset: [0, 4],
    targetOffset: d
  },
  bottomRight: {
    points: ["tr", "br"],
    overflow: p,
    offset: [0, 4],
    targetOffset: d
  }
};
var g = f;
var m = require("./27193.js");
var v = require("./45406.js");
var y = require("./62661.js");
var h = m.Z.ESC;
var b = m.Z.TAB;
function w(e) {
  var t = e.visible;
  var r = e.setTriggerVisible;
  var n = e.triggerRef;
  var i = e.onVisibleChange;
  var o = e.autoFocus;
  var a = s.useRef(false);
  function u() {
    var e;
    var o;
    var a;
    var s;
    if (t && n.current) {
      if ((e = n.current) !== null && e !== undefined && (o = e.triggerRef) !== null && o !== undefined && (a = o.current) !== null && a !== undefined && (s = a.focus) !== null && s !== undefined) {
        s.call(a);
      }
      r(false);
      if (typeof i === "function") {
        i(false);
      }
    }
  }
  function l() {
    var e;
    var t;
    var r;
    var i;
    var o = (0, y.tS)((e = n.current) === null || e === undefined || (t = e.popupRef) === null || t === undefined || (r = t.current) === null || r === undefined || (i = r.getElement) === null || i === undefined ? undefined : i.call(r));
    var s = o[0];
    return !!s?.focus && (s.focus(), a.current = true, true);
  }
  function c(e) {
    switch (e.keyCode) {
      case h:
        u();
        break;
      case b:
        var t = false;
        if (!a.current) {
          t = l();
        }
        if (t) {
          e.preventDefault();
        } else {
          u();
        }
        break;
    }
  }
  s.useEffect(function () {
    if (t) {
      window.addEventListener("keydown", c);
      if (o) {
        (0, v.Z)(l, 3);
      }
      return function () {
        window.removeEventListener("keydown", c);
        a.current = false;
      };
    } else {
      return function () {
        a.current = false;
      };
    }
  }, [t]);
}
var x = ["arrow", "prefixCls", "transitionName", "animation", "align", "placement", "placements", "getPopupContainer", "showAction", "hideAction", "overlayClassName", "overlayStyle", "visible", "trigger", "autoFocus"];
function E(e, t) {
  var r = e.arrow;
  var l = r !== undefined && r;
  var p = e.prefixCls;
  var d = p === undefined ? "rc-dropdown" : p;
  var f = e.transitionName;
  var m = e.animation;
  var v = e.align;
  var y = e.placement;
  var h = y === undefined ? "bottomLeft" : y;
  var b = e.placements;
  var E = b === undefined ? g : b;
  var k = e.getPopupContainer;
  var S = e.showAction;
  var T = e.hideAction;
  var C = e.overlayClassName;
  var A = e.overlayStyle;
  var _ = e.visible;
  var O = e.trigger;
  var M = O === undefined ? ["hover"] : O;
  var P = e.autoFocus;
  var q = (0, a.Z)(e, x);
  var N = s.useState();
  var R = (0, o.Z)(N, 2);
  var I = R[0];
  var j = R[1];
  var D = "visible" in e ? _ : I;
  var L = s.useRef(null);
  s.useImperativeHandle(t, function () {
    return L.current;
  });
  w({
    visible: D,
    setTriggerVisible: j,
    triggerRef: L,
    onVisibleChange: e.onVisibleChange,
    autoFocus: P
  });
  function F() {
    var t;
    var r = e.overlay;
    t = typeof r === "function" ? r() : r;
    return t;
  }
  function Z(t) {
    var r = e.onOverlayClick;
    j(false);
    if (r) {
      r(t);
    }
  }
  function z(t) {
    var r = e.onVisibleChange;
    j(t);
    if (typeof r === "function") {
      r(t);
    }
  }
  function U() {
    var e = F();
    return s.createElement(s.Fragment, null, l && s.createElement("div", {
      className: `${d}-arrow`
    }), e);
  }
  function B() {
    var t = e.overlay;
    if (typeof t === "function") {
      return U;
    } else {
      return U();
    }
  }
  function V() {
    var t = e.minOverlayWidthMatchTrigger;
    var r = e.alignPoint;
    if ("minOverlayWidthMatchTrigger" in e) {
      return t;
    } else {
      return !r;
    }
  }
  function H() {
    var t = e.openClassName;
    if (t !== undefined) {
      return t;
    } else {
      return `${d}-open`;
    }
  }
  function W() {
    var t = e.children;
    var r = t.props ? t.props : {};
    var n = c(r.className, H());
    if (D && t) {
      return s.cloneElement(t, {
        className: n
      });
    } else {
      return t;
    }
  }
  var Y = T;
  if (!Y && M.indexOf("contextMenu") !== -1) {
    Y = ["click"];
  }
  return s.createElement(u.Z, (0, i.Z)((0, i.Z)({
    builtinPlacements: E
  }, q), {}, {
    prefixCls: d,
    ref: L,
    popupClassName: c(C, (0, n.Z)({}, `${d}-show-arrow`, l)),
    popupStyle: A,
    action: M,
    showAction: S,
    hideAction: Y || [],
    popupPlacement: h,
    popupAlign: v,
    popupTransitionName: f,
    popupAnimation: m,
    popupVisible: D,
    stretch: V() ? "minWidth" : "",
    popup: B(),
    onPopupVisibleChange: z,
    onPopupClick: Z,
    getPopupContainer: k
  }), W());
}
var k = s.forwardRef(E);
var S = k;
};
