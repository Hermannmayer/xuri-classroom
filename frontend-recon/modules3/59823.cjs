// webpack module 59823 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return q;
  }
});
var n = require("./34256.js");
var i = require("./23874.js");
var o = require("./59496.js");
var a = require.t(o, 2);
var s = require("./3570.js");
var u = require("./91613.js");
var l = require("./38399.js");
var c = l;
var p = require("./27193.js");
function d() {
  var e = (0, u.Z)({}, a);
  return e.useId;
}
var f = 0;
var g = d();
var m = g ? function (e) {
  var t = g();
  return e || t;
} : function (e) {
  var t = o.useState("ssr-id");
  var r = (0, i.Z)(t, 2);
  var n = r[0];
  var a = r[1];
  o.useEffect(function () {
    var e = f;
    f += 1;
    a(`rc_unique_${e}`);
  }, []);
  return e || n;
};
var v = require("./39323.js");
var y = require("./35689.js");
var h = require("./96598.js");
function b(e) {
  var t = e.prefixCls;
  var r = e.style;
  var i = e.visible;
  var a = e.maskProps;
  var s = e.motionName;
  return o.createElement(h.default, {
    key: "mask",
    visible: i,
    motionName: s,
    leavedClassName: `${t}-mask-hidden`
  }, function (e, i) {
    var s = e.className;
    var l = e.style;
    return o.createElement("div", (0, n.Z)({
      ref: i,
      style: (0, u.Z)((0, u.Z)({}, l), r),
      className: c(`${t}-mask`, s)
    }, a));
  });
}
function w(e, t, r) {
  var n = t;
  if (!n && r) {
    n = `${e}-${r}`;
  }
  return n;
}
function x(e, t) {
  var r = e[`page${t ? "Y" : "X"}Offset`];
  var n = `scroll${t ? "Top" : "Left"}`;
  if (typeof r !== "number") {
    var i = e.document;
    r = i.documentElement[n];
    if (typeof r !== "number") {
      r = i.body[n];
    }
  }
  return r;
}
function E(e) {
  var t = e.getBoundingClientRect();
  var r = {
    left: t.left,
    top: t.top
  };
  var n = e.ownerDocument;
  var i = n.defaultView || n.parentWindow;
  r.left += x(i);
  r.top += x(i, true);
  return r;
}
var k = o.memo(function (e) {
  var t = e.children;
  return t;
}, function (e, t) {
  var r = t.shouldUpdate;
  return !r;
});
var S = {
  width: 0,
  height: 0,
  overflow: "hidden",
  outline: "none"
};
var T = o.forwardRef(function (e, t) {
  var r = e.prefixCls;
  var i = e.className;
  var a = e.style;
  var s = e.title;
  var l = e.ariaId;
  var p = e.footer;
  var d = e.closable;
  var f = e.closeIcon;
  var g = e.onClose;
  var m = e.children;
  var v = e.bodyStyle;
  var y = e.bodyProps;
  var h = e.modalRender;
  var b = e.onMouseDown;
  var w = e.onMouseUp;
  var x = e.holderRef;
  var E = e.visible;
  var T = e.forceRender;
  var C = e.width;
  var A = e.height;
  var _ = (0, o.useRef)();
  var O = (0, o.useRef)();
  o.useImperativeHandle(t, function () {
    return {
      focus: function () {
        var e;
        if ((e = _.current) !== null && e !== undefined) {
          e.focus();
        }
      },
      changeActive: function (e) {
        var t = document;
        var r = t.activeElement;
        if (e && r === O.current) {
          _.current.focus();
        } else if (!e && r === _.current) {
          O.current.focus();
        }
      }
    };
  });
  var M;
  var P;
  var q;
  var N = {};
  if (C !== undefined) {
    N.width = C;
  }
  if (A !== undefined) {
    N.height = A;
  }
  if (p) {
    M = o.createElement("div", {
      className: `${r}-footer`
    }, p);
  }
  if (s) {
    P = o.createElement("div", {
      className: `${r}-header`
    }, o.createElement("div", {
      className: `${r}-title`,
      id: l
    }, s));
  }
  if (d) {
    q = o.createElement("button", {
      type: "button",
      onClick: g,
      "aria-label": "Close",
      className: `${r}-close`
    }, f || o.createElement("span", {
      className: `${r}-close-x`
    }));
  }
  var R = o.createElement("div", {
    className: `${r}-content`
  }, q, P, o.createElement("div", (0, n.Z)({
    className: `${r}-body`,
    style: v
  }, y), m), M);
  return o.createElement("div", {
    key: "dialog-element",
    role: "dialog",
    "aria-labelledby": s ? l : null,
    "aria-modal": "true",
    ref: x,
    style: (0, u.Z)((0, u.Z)({}, a), N),
    className: c(r, i),
    onMouseDown: b,
    onMouseUp: w
  }, o.createElement("div", {
    tabIndex: 0,
    ref: _,
    style: S,
    "aria-hidden": "true"
  }), o.createElement(k, {
    shouldUpdate: E || T
  }, h ? h(R) : R), o.createElement("div", {
    tabIndex: 0,
    ref: O,
    style: S,
    "aria-hidden": "true"
  }));
});
var C = T;
var A = o.forwardRef(function (e, t) {
  var r = e.prefixCls;
  var a = e.title;
  var s = e.style;
  var l = e.className;
  var p = e.visible;
  var d = e.forceRender;
  var f = e.destroyOnClose;
  var g = e.motionName;
  var m = e.ariaId;
  var v = e.onVisibleChanged;
  var y = e.mousePosition;
  var b = (0, o.useRef)();
  var w = o.useState();
  var x = (0, i.Z)(w, 2);
  var k = x[0];
  var S = x[1];
  var T = {};
  function A() {
    var e = E(b.current);
    S(y ? `${y.x - e.left}px ${y.y - e.top}px` : "");
  }
  if (k) {
    T.transformOrigin = k;
  }
  return o.createElement(h.default, {
    visible: p,
    onVisibleChanged: v,
    onAppearPrepare: A,
    onEnterPrepare: A,
    forceRender: d,
    motionName: g,
    removeOnLeave: f,
    ref: b
  }, function (i, p) {
    var d = i.className;
    var f = i.style;
    return o.createElement(C, (0, n.Z)({}, e, {
      ref: t,
      title: a,
      ariaId: m,
      prefixCls: r,
      holderRef: p,
      style: (0, u.Z)((0, u.Z)((0, u.Z)({}, f), s), T),
      className: c(l, d)
    }));
  });
});
A.displayName = "Content";
var _ = A;
function O(e) {
  var t = e.prefixCls;
  var r = t === undefined ? "rc-dialog" : t;
  var a = e.zIndex;
  var s = e.visible;
  var l = s !== undefined && s;
  var d = e.keyboard;
  var f = d === undefined || d;
  var g = e.focusTriggerAfterClose;
  var h = g === undefined || g;
  var x = e.wrapStyle;
  var E = e.wrapClassName;
  var k = e.wrapProps;
  var S = e.onClose;
  var T = e.afterClose;
  var C = e.transitionName;
  var A = e.animation;
  var O = e.closable;
  var M = O === undefined || O;
  var P = e.mask;
  var q = P === undefined || P;
  var N = e.maskTransitionName;
  var R = e.maskAnimation;
  var I = e.maskClosable;
  var j = I === undefined || I;
  var D = e.maskStyle;
  var L = e.maskProps;
  var F = e.rootClassName;
  var Z = (0, o.useRef)();
  var z = (0, o.useRef)();
  var U = (0, o.useRef)();
  var B = o.useState(l);
  var V = (0, i.Z)(B, 2);
  var H = V[0];
  var W = V[1];
  var Y = m();
  function Q() {
    if (!(0, v.Z)(z.current, document.activeElement)) {
      Z.current = document.activeElement;
    }
  }
  function $() {
    var e;
    if (!(0, v.Z)(z.current, document.activeElement)) {
      if ((e = U.current) !== null && e !== undefined) {
        e.focus();
      }
    }
  }
  function G(e) {
    if (e) {
      $();
    } else {
      W(false);
      if (q && Z.current && h) {
        try {
          Z.current.focus({
            preventScroll: true
          });
        } catch (t) {}
        Z.current = null;
      }
      if (H) {
        if (T !== null && T !== undefined) {
          T();
        }
      }
    }
  }
  function K(e) {
    if (S !== null && S !== undefined) {
      S(e);
    }
  }
  var J = (0, o.useRef)(false);
  var X = (0, o.useRef)();
  function ee() {
    clearTimeout(X.current);
    J.current = true;
  }
  function te() {
    X.current = setTimeout(function () {
      J.current = false;
    });
  }
  var re = null;
  function ne(e) {
    if (f && e.keyCode === p.Z.ESC) {
      e.stopPropagation();
      K(e);
      return;
    }
    if (l && e.keyCode === p.Z.TAB) {
      U.current.changeActive(!e.shiftKey);
    }
  }
  if (j) {
    re = function (e) {
      if (J.current) {
        J.current = false;
      } else if (z.current === e.target) {
        K(e);
      }
    };
  }
  (0, o.useEffect)(function () {
    if (l) {
      W(true);
      Q();
    }
  }, [l]);
  (0, o.useEffect)(function () {
    return function () {
      clearTimeout(X.current);
    };
  }, []);
  return o.createElement("div", (0, n.Z)({
    className: c(`${r}-root`, F)
  }, (0, y.Z)(e, {
    data: true
  })), o.createElement(b, {
    prefixCls: r,
    visible: q && l,
    motionName: w(r, N, R),
    style: (0, u.Z)({
      zIndex: a
    }, D),
    maskProps: L
  }), o.createElement("div", (0, n.Z)({
    tabIndex: -1,
    onKeyDown: ne,
    className: c(`${r}-wrap`, E),
    ref: z,
    onClick: re,
    style: (0, u.Z)((0, u.Z)({
      zIndex: a
    }, x), {}, {
      display: H ? null : "none"
    })
  }, k), o.createElement(_, (0, n.Z)({}, e, {
    onMouseDown: ee,
    onMouseUp: te,
    ref: U,
    closable: M,
    ariaId: Y,
    prefixCls: r,
    visible: l && H,
    onClose: K,
    onVisibleChanged: G,
    motionName: w(r, C, A)
  }))));
}
function M(e) {
  var t = e.visible;
  var r = e.getContainer;
  var a = e.forceRender;
  var u = e.destroyOnClose;
  var l = u !== undefined && u;
  var c = e.afterClose;
  var p = o.useState(t);
  var d = (0, i.Z)(p, 2);
  var f = d[0];
  var g = d[1];
  o.useEffect(function () {
    if (t) {
      g(true);
    }
  }, [t]);
  if (a || !l || f) {
    return o.createElement(s.Z, {
      open: t || a || f,
      autoDestroy: false,
      getContainer: r,
      autoLock: t || f
    }, o.createElement(O, (0, n.Z)({}, e, {
      destroyOnClose: l,
      afterClose: function () {
        if (c !== null && c !== undefined) {
          c();
        }
        g(false);
      }
    })));
  } else {
    return null;
  }
}
M.displayName = "Dialog";
var P = M;
var q = P;
};
