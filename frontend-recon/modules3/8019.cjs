// webpack module 8019 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return It;
  }
});
var n = require("./91613.js");
var i = require("./34256.js");
var o = require("./8951.js");
var a = require("./45810.js");
var s = require("./39695.js");
var u = require("./78212.js");
var l = require("./19746.js");
var c = require("./21487.js");
var p = require("./59496.js");
var d = require("./87995.js");
var f = require("./45406.js");
var g = require("./39323.js");
var m = require("./34500.js");
var v = require("./97969.js");
var y = require("./78125.js");
var h = require("./67361.js");
var b = (0, p.forwardRef)(function (e, t) {
  var r = e.didUpdate;
  var n = e.getContainer;
  var i = e.children;
  var o = (0, p.useRef)();
  var a = (0, p.useRef)();
  (0, p.useImperativeHandle)(t, function () {
    return {};
  });
  var s = (0, p.useRef)(false);
  if (!s.current && (0, h.Z)()) {
    a.current = n();
    o.current = a.current.parentNode;
    s.current = true;
  }
  (0, p.useEffect)(function () {
    if (r !== null && r !== undefined) {
      r(e);
    }
  });
  (0, p.useEffect)(function () {
    if (a.current.parentNode === null && o.current !== null) {
      o.current.appendChild(a.current);
    }
    return function () {
      var e;
      if ((e = a.current) !== null && e !== undefined && (e = e.parentNode) !== null && e !== undefined) {
        e.removeChild(a.current);
      }
    };
  }, []);
  if (a.current) {
    return d.createPortal(i, a.current);
  } else {
    return null;
  }
});
var w = b;
var x = require("./38399.js");
var E = x;
function k(e, t, r) {
  if (r) {
    return e[0] === t[0];
  } else {
    return e[0] === t[0] && e[1] === t[1];
  }
}
function S(e, t, r) {
  var i = e[t] || {};
  return (0, n.Z)((0, n.Z)({}, i), r);
}
function T(e, t, r, n) {
  var i = r.points;
  for (var o = Object.keys(e), a = 0; a < o.length; a += 1) {
    var s = o[a];
    if (k(e[s].points, i, n)) {
      return `${t}-placement-${s}`;
    }
  }
  return "";
}
var C = require("./23874.js");
var A = require("./37913.js");
var _ = require("./46744.js");
var O = require("./96598.js");
function M(e) {
  var t = e.prefixCls;
  var r = e.motion;
  var n = e.animation;
  var i = e.transitionName;
  return r || (n ? {
    motionName: `${t}-${n}`
  } : i ? {
    motionName: i
  } : null);
}
function P(e) {
  var t = e.prefixCls;
  var r = e.visible;
  var o = e.zIndex;
  var a = e.mask;
  var s = e.maskMotion;
  var u = e.maskAnimation;
  var l = e.maskTransitionName;
  if (!a) {
    return null;
  }
  var c = {};
  if (s || l || u) {
    c = (0, n.Z)({
      motionAppear: true
    }, M({
      motion: s,
      prefixCls: t,
      transitionName: l,
      animation: u
    }));
  }
  return p.createElement(O.default, (0, i.Z)({}, c, {
    visible: r,
    removeOnLeave: true
  }), function (e) {
    var r = e.className;
    return p.createElement("div", {
      style: {
        zIndex: o
      },
      className: E(`${t}-mask`, r)
    });
  });
}
var q;
var N = require("./75728.js");
function R(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    if (t) {
      n = n.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      });
    }
    r.push.apply(r, n);
  }
  return r;
}
function I(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] ?? {};
    if (t % 2) {
      R(Object(r), true).forEach(function (t) {
        D(e, t, r[t]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(e, Object.getOwnPropertyDescriptors(r));
    } else {
      R(Object(r)).forEach(function (t) {
        Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(r, t));
      });
    }
  }
  return e;
}
function j(e) {
  j = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function (e) {
    return typeof e;
  } : function (e) {
    if (e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype) {
      return "symbol";
    } else {
      return typeof e;
    }
  };
  return j(e);
}
function D(e, t, r) {
  if (t in e) {
    Object.defineProperty(e, t, {
      value: r,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    e[t] = r;
  }
  return e;
}
var L = {
  Webkit: "-webkit-",
  Moz: "-moz-",
  ms: "-ms-",
  O: "-o-"
};
function F() {
  if (q !== undefined) {
    return q;
  }
  q = "";
  var e = document.createElement("p").style;
  var t = "Transform";
  for (var r in L) {
    if (r + t in e) {
      q = r;
    }
  }
  return q;
}
function Z() {
  if (F()) {
    return `${F()}TransitionProperty`;
  } else {
    return "transitionProperty";
  }
}
function z() {
  if (F()) {
    return `${F()}Transform`;
  } else {
    return "transform";
  }
}
function U(e, t) {
  var r = Z();
  if (r) {
    e.style[r] = t;
    if (r !== "transitionProperty") {
      e.style.transitionProperty = t;
    }
  }
}
function B(e, t) {
  var r = z();
  if (r) {
    e.style[r] = t;
    if (r !== "transform") {
      e.style.transform = t;
    }
  }
}
function V(e) {
  return e.style.transitionProperty || e.style[Z()];
}
function H(e) {
  var t = window.getComputedStyle(e, null);
  var r = t.getPropertyValue("transform") || t.getPropertyValue(z());
  if (r && r !== "none") {
    var n = r.replace(/[^0-9\-.,]/g, "").split(",");
    return {
      x: parseFloat(n[12] || n[4], 0),
      y: parseFloat(n[13] || n[5], 0)
    };
  }
  return {
    x: 0,
    y: 0
  };
}
var W = /matrix\((.*)\)/;
var Y = /matrix3d\((.*)\)/;
function Q(e, t) {
  var r = window.getComputedStyle(e, null);
  var n = r.getPropertyValue("transform") || r.getPropertyValue(z());
  if (n && n !== "none") {
    var i;
    var o = n.match(W);
    if (o) {
      o = o[1];
      i = o.split(",").map(function (e) {
        return parseFloat(e, 10);
      });
      i[4] = t.x;
      i[5] = t.y;
      B(e, `matrix(${i.join(",")})`);
    } else {
      var a = n.match(Y)[1];
      i = a.split(",").map(function (e) {
        return parseFloat(e, 10);
      });
      i[12] = t.x;
      i[13] = t.y;
      B(e, `matrix3d(${i.join(",")})`);
    }
  } else {
    B(e, `translateX(${t.x}px) translateY(${t.y}px) translateZ(0)`);
  }
}
var $;
var G = /[\-+]?(?:\d*\.|)\d+(?:[eE][\-+]?\d+|)/.source;
function K(e) {
  var t = e.style.display;
  e.style.display = "none";
  e.offsetHeight;
  e.style.display = t;
}
function J(e, t, r) {
  var n = r;
  if (j(t) !== "object") {
    if (typeof n !== "undefined") {
      if (typeof n === "number") {
        n = `${n}px`;
      }
      e.style[t] = n;
      return;
    } else {
      return $(e, t);
    }
  }
  for (var i in t) {
    if (t.hasOwnProperty(i)) {
      J(e, i, t[i]);
    }
  }
}
function X(e) {
  var t;
  var r;
  var n;
  var i = e.ownerDocument;
  var o = i.body;
  var a = i && i.documentElement;
  t = e.getBoundingClientRect();
  r = Math.floor(t.left);
  n = Math.floor(t.top);
  r -= a.clientLeft || o.clientLeft || 0;
  n -= a.clientTop || o.clientTop || 0;
  return {
    left: r,
    top: n
  };
}
function ee(e, t) {
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
function te(e) {
  return ee(e);
}
function re(e) {
  return ee(e, true);
}
function ne(e) {
  var t = X(e);
  var r = e.ownerDocument;
  var n = r.defaultView || r.parentWindow;
  t.left += te(n);
  t.top += re(n);
  return t;
}
function ie(e) {
  return e !== null && e !== undefined && e == e.window;
}
function oe(e) {
  if (ie(e)) {
    return e.document;
  } else if (e.nodeType === 9) {
    return e;
  } else {
    return e.ownerDocument;
  }
}
function ae(e, t, r) {
  var n = r;
  var i = "";
  var o = oe(e);
  n = n || o.defaultView.getComputedStyle(e, null);
  if (n) {
    i = n.getPropertyValue(t) || n[t];
  }
  return i;
}
var se = new RegExp(`^(${G})(?!px)[a-z%]+\$`, "i");
var ue = /^(top|right|bottom|left)$/;
var le = "currentStyle";
var ce = "runtimeStyle";
var pe = "left";
var de = "px";
function fe(e, t) {
  var r = e[le] && e[le][t];
  if (se.test(r) && !ue.test(t)) {
    var n = e.style;
    var i = n[pe];
    var o = e[ce][pe];
    e[ce][pe] = e[le][pe];
    n[pe] = t === "fontSize" ? "1em" : r || 0;
    r = n.pixelLeft + de;
    n[pe] = i;
    e[ce][pe] = o;
  }
  if (r === "") {
    return "auto";
  } else {
    return r;
  }
}
function ge(e, t) {
  if (e === "left") {
    if (t.useCssRight) {
      return "right";
    } else {
      return e;
    }
  } else if (t.useCssBottom) {
    return "bottom";
  } else {
    return e;
  }
}
function me(e) {
  if (e === "left") {
    return "right";
  } else if (e === "right") {
    return "left";
  } else if (e === "top") {
    return "bottom";
  } else if (e === "bottom") {
    return "top";
  } else {
    return undefined;
  }
}
function ve(e, t, r) {
  if (J(e, "position") === "static") {
    e.style.position = "relative";
  }
  var n = -999;
  var i = -999;
  var o = ge("left", r);
  var a = ge("top", r);
  var s = me(o);
  var u = me(a);
  if (o !== "left") {
    n = 999;
  }
  if (a !== "top") {
    i = 999;
  }
  var l = "";
  var c = ne(e);
  if ("left" in t || "top" in t) {
    l = V(e) || "";
    U(e, "none");
  }
  if ("left" in t) {
    e.style[s] = "";
    e.style[o] = `${n}px`;
  }
  if ("top" in t) {
    e.style[u] = "";
    e.style[a] = `${i}px`;
  }
  K(e);
  var p = ne(e);
  var d = {};
  for (var f in t) {
    if (t.hasOwnProperty(f)) {
      var g = ge(f, r);
      var m = f === "left" ? n : i;
      var v = c[f] - p[f];
      d[g] = g === f ? m + v : m - v;
    }
  }
  J(e, d);
  K(e);
  if ("left" in t || "top" in t) {
    U(e, l);
  }
  var y = {};
  for (var h in t) {
    if (t.hasOwnProperty(h)) {
      var b = ge(h, r);
      var w = t[h] - c[h];
      y[b] = h === b ? d[b] + w : d[b] - w;
    }
  }
  J(e, y);
}
function ye(e, t) {
  var r = ne(e);
  var n = H(e);
  var i = {
    x: n.x,
    y: n.y
  };
  if ("left" in t) {
    i.x = n.x + t.left - r.left;
  }
  if ("top" in t) {
    i.y = n.y + t.top - r.top;
  }
  Q(e, i);
}
function he(e, t, r) {
  if (r.ignoreShake) {
    var n = ne(e);
    var i = n.left.toFixed(0);
    var o = n.top.toFixed(0);
    var a = t.left.toFixed(0);
    var s = t.top.toFixed(0);
    if (i === a && o === s) {
      return;
    }
  }
  if (r.useCssRight || r.useCssBottom) {
    ve(e, t, r);
  } else if (r.useCssTransform && z() in document.body.style) {
    ye(e, t);
  } else {
    ve(e, t, r);
  }
}
function be(e, t) {
  for (var r = 0; r < e.length; r++) {
    t(e[r]);
  }
}
function we(e) {
  return $(e, "boxSizing") === "border-box";
}
if (typeof window !== "undefined") {
  $ = window.getComputedStyle ? ae : fe;
}
var xe = ["margin", "border", "padding"];
var Ee = -1;
var ke = 2;
var Se = 1;
var Te = 0;
function Ce(e, t, r) {
  var n;
  var i = {};
  var o = e.style;
  for (n in t) {
    if (t.hasOwnProperty(n)) {
      i[n] = o[n];
      o[n] = t[n];
    }
  }
  r.call(e);
  for (n in t) {
    if (t.hasOwnProperty(n)) {
      o[n] = i[n];
    }
  }
}
function Ae(e, t, r) {
  var n;
  var i;
  var o;
  var a = 0;
  for (i = 0; i < t.length; i++) {
    n = t[i];
    if (n) {
      for (o = 0; o < r.length; o++) {
        var s = undefined;
        s = n === "border" ? `${n}${r[o]}Width` : n + r[o];
        a += parseFloat($(e, s)) || 0;
      }
    }
  }
  return a;
}
var _e = {
  getParent: function (e) {
    var t = e;
    do {
      t = t.nodeType === 11 && t.host ? t.host : t.parentNode;
    } while (t && t.nodeType !== 1 && t.nodeType !== 9);
    return t;
  }
};
function Oe(e, t, r) {
  var n = r;
  if (ie(e)) {
    if (t === "width") {
      return _e.viewportWidth(e);
    } else {
      return _e.viewportHeight(e);
    }
  }
  if (e.nodeType === 9) {
    if (t === "width") {
      return _e.docWidth(e);
    } else {
      return _e.docHeight(e);
    }
  }
  var i = t === "width" ? ["Left", "Right"] : ["Top", "Bottom"];
  var o = t === "width" ? Math.floor(e.getBoundingClientRect().width) : Math.floor(e.getBoundingClientRect().height);
  var a = we(e);
  var s = 0;
  if (o === null || o === undefined || o <= 0) {
    o = undefined;
    s = $(e, t);
    if (s === null || s === undefined || Number(s) < 0) {
      s = e.style[t] || 0;
    }
    s = Math.floor(parseFloat(s)) || 0;
  }
  if (n === undefined) {
    n = a ? Se : Ee;
  }
  var u = o !== undefined || a;
  var l = o || s;
  if (n === Ee) {
    if (u) {
      return l - Ae(e, ["border", "padding"], i);
    } else {
      return s;
    }
  } else if (u) {
    if (n === Se) {
      return l;
    } else {
      return l + (n === ke ? -Ae(e, ["border"], i) : Ae(e, ["margin"], i));
    }
  } else {
    return s + Ae(e, xe.slice(n), i);
  }
}
be(["Width", "Height"], function (e) {
  _e[`doc${e}`] = function (t) {
    var r = t.document;
    return Math.max(r.documentElement[`scroll${e}`], r.body[`scroll${e}`], _e[`viewport${e}`](r));
  };
  _e[`viewport${e}`] = function (t) {
    var r = `client${e}`;
    var n = t.document;
    var i = n.body;
    var o = n.documentElement;
    var a = o[r];
    return n.compatMode === "CSS1Compat" && a || i && i[r] || a;
  };
});
var Me = {
  position: "absolute",
  visibility: "hidden",
  display: "block"
};
function Pe() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
    t[r] = arguments[r];
  }
  var n;
  var i = t[0];
  if (i.offsetWidth !== 0) {
    n = Oe.apply(undefined, t);
  } else {
    Ce(i, Me, function () {
      n = Oe.apply(undefined, t);
    });
  }
  return n;
}
function qe(e, t) {
  for (var r in t) {
    if (t.hasOwnProperty(r)) {
      e[r] = t[r];
    }
  }
  return e;
}
be(["width", "height"], function (e) {
  var t = e.charAt(0).toUpperCase() + e.slice(1);
  _e[`outer${t}`] = function (t, r) {
    return t && Pe(t, e, r ? Te : Se);
  };
  var r = e === "width" ? ["Left", "Right"] : ["Top", "Bottom"];
  _e[e] = function (t, n) {
    var i = n;
    if (i === undefined) {
      return t && Pe(t, e, Ee);
    }
    if (t) {
      var o = we(t);
      if (o) {
        i += Ae(t, ["padding", "border"], r);
      }
      return J(t, e, i);
    }
  };
});
var Ne = {
  getWindow: function (e) {
    if (e && e.document && e.setTimeout) {
      return e;
    }
    var t = e.ownerDocument || e;
    return t.defaultView || t.parentWindow;
  },
  getDocument: oe,
  offset: function (e, t, r) {
    if (typeof t === "undefined") {
      return ne(e);
    }
    he(e, t, r || {});
  },
  isWindow: ie,
  each: be,
  css: J,
  clone: function (e) {
    var t;
    var r = {};
    for (t in e) {
      if (e.hasOwnProperty(t)) {
        r[t] = e[t];
      }
    }
    var n = e.overflow;
    if (n) {
      for (t in e) {
        if (e.hasOwnProperty(t)) {
          r.overflow[t] = e.overflow[t];
        }
      }
    }
    return r;
  },
  mix: qe,
  getWindowScrollLeft: function (e) {
    return te(e);
  },
  getWindowScrollTop: function (e) {
    return re(e);
  },
  merge: function () {
    var e = {};
    for (var t = 0; t < arguments.length; t++) {
      Ne.mix(e, t < 0 || arguments.length <= t ? undefined : arguments[t]);
    }
    return e;
  },
  viewportWidth: 0,
  viewportHeight: 0
};
qe(Ne, _e);
var Re = Ne.getParent;
function Ie(e) {
  if (Ne.isWindow(e) || e.nodeType === 9) {
    return null;
  }
  var t;
  var r = Ne.getDocument(e);
  var n = r.body;
  var i = Ne.css(e, "position");
  var o = i === "fixed" || i === "absolute";
  if (!o) {
    if (e.nodeName.toLowerCase() === "html") {
      return null;
    } else {
      return Re(e);
    }
  }
  for (t = Re(e); t && t !== n && t.nodeType !== 9; t = Re(t)) {
    i = Ne.css(t, "position");
    if (i !== "static") {
      return t;
    }
  }
  return null;
}
var je = Ne.getParent;
function De(e) {
  if (Ne.isWindow(e) || e.nodeType === 9) {
    return false;
  }
  var t = Ne.getDocument(e);
  var r = t.body;
  var n = null;
  for (n = je(e); n && n !== r && n !== t; n = je(n)) {
    var i = Ne.css(n, "position");
    if (i === "fixed") {
      return true;
    }
  }
  return false;
}
function Le(e, t) {
  var r = {
    left: 0,
    right: Infinity,
    top: 0,
    bottom: Infinity
  };
  var n = Ie(e);
  var i = Ne.getDocument(e);
  var o = i.defaultView || i.parentWindow;
  var a = i.body;
  var s = i.documentElement;
  while (n) {
    if (navigator.userAgent.indexOf("MSIE") !== -1 && n.clientWidth === 0 || n === a || n === s || Ne.css(n, "overflow") === "visible") {
      if (n === a || n === s) {
        break;
      }
    } else {
      var u = Ne.offset(n);
      u.left += n.clientLeft;
      u.top += n.clientTop;
      r.top = Math.max(r.top, u.top);
      r.right = Math.min(r.right, u.left + n.clientWidth);
      r.bottom = Math.min(r.bottom, u.top + n.clientHeight);
      r.left = Math.max(r.left, u.left);
    }
    n = Ie(n);
  }
  var l = null;
  if (!Ne.isWindow(e) && e.nodeType !== 9) {
    l = e.style.position;
    var c = Ne.css(e, "position");
    if (c === "absolute") {
      e.style.position = "fixed";
    }
  }
  var p = Ne.getWindowScrollLeft(o);
  var d = Ne.getWindowScrollTop(o);
  var f = Ne.viewportWidth(o);
  var g = Ne.viewportHeight(o);
  var m = s.scrollWidth;
  var v = s.scrollHeight;
  var y = window.getComputedStyle(a);
  if (y.overflowX === "hidden") {
    m = o.innerWidth;
  }
  if (y.overflowY === "hidden") {
    v = o.innerHeight;
  }
  if (e.style) {
    e.style.position = l;
  }
  if (t || De(e)) {
    r.left = Math.max(r.left, p);
    r.top = Math.max(r.top, d);
    r.right = Math.min(r.right, p + f);
    r.bottom = Math.min(r.bottom, d + g);
  } else {
    var h = Math.max(m, p + f);
    r.right = Math.min(r.right, h);
    var b = Math.max(v, d + g);
    r.bottom = Math.min(r.bottom, b);
  }
  if (r.top >= 0 && r.left >= 0 && r.bottom > r.top && r.right > r.left) {
    return r;
  } else {
    return null;
  }
}
function Fe(e, t, r, n) {
  var i = Ne.clone(e);
  var o = {
    width: t.width,
    height: t.height
  };
  if (n.adjustX && i.left < r.left) {
    i.left = r.left;
  }
  if (n.resizeWidth && i.left >= r.left && i.left + o.width > r.right) {
    o.width -= i.left + o.width - r.right;
  }
  if (n.adjustX && i.left + o.width > r.right) {
    i.left = Math.max(r.right - o.width, r.left);
  }
  if (n.adjustY && i.top < r.top) {
    i.top = r.top;
  }
  if (n.resizeHeight && i.top >= r.top && i.top + o.height > r.bottom) {
    o.height -= i.top + o.height - r.bottom;
  }
  if (n.adjustY && i.top + o.height > r.bottom) {
    i.top = Math.max(r.bottom - o.height, r.top);
  }
  return Ne.mix(i, o);
}
function Ze(e) {
  var t;
  var r;
  var n;
  if (Ne.isWindow(e) || e.nodeType === 9) {
    var i = Ne.getWindow(e);
    t = {
      left: Ne.getWindowScrollLeft(i),
      top: Ne.getWindowScrollTop(i)
    };
    r = Ne.viewportWidth(i);
    n = Ne.viewportHeight(i);
  } else {
    t = Ne.offset(e);
    r = Ne.outerWidth(e);
    n = Ne.outerHeight(e);
  }
  t.width = r;
  t.height = n;
  return t;
}
function ze(e, t) {
  var r = t.charAt(0);
  var n = t.charAt(1);
  var i = e.width;
  var o = e.height;
  var a = e.left;
  var s = e.top;
  if (r === "c") {
    s += o / 2;
  } else if (r === "b") {
    s += o;
  }
  if (n === "c") {
    a += i / 2;
  } else if (n === "r") {
    a += i;
  }
  return {
    left: a,
    top: s
  };
}
function Ue(e, t, r, n, i) {
  var o = ze(t, r[1]);
  var a = ze(e, r[0]);
  var s = [a.left - o.left, a.top - o.top];
  return {
    left: Math.round(e.left - s[0] + n[0] - i[0]),
    top: Math.round(e.top - s[1] + n[1] - i[1])
  };
}
function Be(e, t, r) {
  return e.left < r.left || e.left + t.width > r.right;
}
function Ve(e, t, r) {
  return e.top < r.top || e.top + t.height > r.bottom;
}
function He(e, t, r) {
  return e.left > r.right || e.left + t.width < r.left;
}
function We(e, t, r) {
  return e.top > r.bottom || e.top + t.height < r.top;
}
function Ye(e, t, r) {
  var n = [];
  Ne.each(e, function (e) {
    n.push(e.replace(t, function (e) {
      return r[e];
    }));
  });
  return n;
}
function Qe(e, t) {
  e[t] = -e[t];
  return e;
}
function $e(e, t) {
  var r;
  r = /%$/.test(e) ? parseInt(e.substring(0, e.length - 1), 10) / 100 * t : parseInt(e, 10);
  return r || 0;
}
function Ge(e, t) {
  e[0] = $e(e[0], t.width);
  e[1] = $e(e[1], t.height);
}
function Ke(e, t, r, n) {
  var i = r.points;
  var o = r.offset || [0, 0];
  var a = r.targetOffset || [0, 0];
  var s = r.overflow;
  var u = r.source || e;
  o = [].concat(o);
  a = [].concat(a);
  s = s || {};
  var l = {};
  var c = 0;
  var p = !!s && !!s.alwaysByViewport;
  var d = Le(u, p);
  var f = Ze(u);
  Ge(o, f);
  Ge(a, t);
  var g = Ue(f, t, i, o, a);
  var m = Ne.merge(f, g);
  if (d && (s.adjustX || s.adjustY) && n) {
    if (s.adjustX && Be(g, f, d)) {
      var v = Ye(i, /[lr]/gi, {
        l: "r",
        r: "l"
      });
      var y = Qe(o, 0);
      var h = Qe(a, 0);
      var b = Ue(f, t, v, y, h);
      if (!He(b, f, d)) {
        c = 1;
        i = v;
        o = y;
        a = h;
      }
    }
    if (s.adjustY && Ve(g, f, d)) {
      var w = Ye(i, /[tb]/gi, {
        t: "b",
        b: "t"
      });
      var x = Qe(o, 1);
      var E = Qe(a, 1);
      var k = Ue(f, t, w, x, E);
      if (!We(k, f, d)) {
        c = 1;
        i = w;
        o = x;
        a = E;
      }
    }
    if (c) {
      g = Ue(f, t, i, o, a);
      Ne.mix(m, g);
    }
    var S = Be(g, f, d);
    var T = Ve(g, f, d);
    if (S || T) {
      var C = i;
      if (S) {
        C = Ye(i, /[lr]/gi, {
          l: "r",
          r: "l"
        });
      }
      if (T) {
        C = Ye(i, /[tb]/gi, {
          t: "b",
          b: "t"
        });
      }
      i = C;
      o = r.offset || [0, 0];
      a = r.targetOffset || [0, 0];
    }
    l.adjustX = s.adjustX && S;
    l.adjustY = s.adjustY && T;
    if (l.adjustX || l.adjustY) {
      m = Fe(g, f, d, l);
    }
  }
  if (m.width !== f.width) {
    Ne.css(u, "width", Ne.width(u) + m.width - f.width);
  }
  if (m.height !== f.height) {
    Ne.css(u, "height", Ne.height(u) + m.height - f.height);
  }
  Ne.offset(u, {
    left: m.left,
    top: m.top
  }, {
    useCssRight: r.useCssRight,
    useCssBottom: r.useCssBottom,
    useCssTransform: r.useCssTransform,
    ignoreShake: r.ignoreShake
  });
  return {
    points: i,
    offset: o,
    targetOffset: a,
    overflow: l
  };
}
function Je(e, t) {
  var r = Le(e, t);
  var n = Ze(e);
  return !r || n.left + n.width <= r.left || n.top + n.height <= r.top || n.left >= r.right || n.top >= r.bottom;
}
function Xe(e, t, r) {
  var n = r.target || t;
  var i = Ze(n);
  var o = !Je(n, r.overflow && r.overflow.alwaysByViewport);
  return Ke(e, i, r, o);
}
function et(e, t, r) {
  var n;
  var i;
  var o = Ne.getDocument(e);
  var a = o.defaultView || o.parentWindow;
  var s = Ne.getWindowScrollLeft(a);
  var u = Ne.getWindowScrollTop(a);
  var l = Ne.viewportWidth(a);
  var c = Ne.viewportHeight(a);
  n = "pageX" in t ? t.pageX : s + t.clientX;
  i = "pageY" in t ? t.pageY : u + t.clientY;
  var p = {
    left: n,
    top: i,
    width: 0,
    height: 0
  };
  var d = n >= 0 && n <= s + l && i >= 0 && i <= u + c;
  var f = [r.points[0], "cc"];
  return Ke(e, p, I(I({}, r), {}, {
    points: f
  }), d);
}
Xe.__getOffsetParent = Ie;
Xe.__getVisibleRectForElement = Le;
var tt = require("./44207.js");
var rt = require("./19078.js");
var nt = require("./88174.js");
function it(e, t) {
  var r = p.useRef(false);
  var n = p.useRef(null);
  function i() {
    window.clearTimeout(n.current);
  }
  function o(a) {
    i();
    if (r.current && a !== true) {
      n.current = window.setTimeout(function () {
        r.current = false;
        o();
      }, t);
    } else {
      if (e(a) === false) {
        return;
      }
      r.current = true;
      n.current = window.setTimeout(function () {
        r.current = false;
      }, t);
    }
  }
  return [o, function () {
    r.current = false;
    i();
  }];
}
var ot = require("./73023.js");
function at(e, t) {
  return e === t || !!e && !!t && ("pageX" in t && "pageY" in t ? e.pageX === t.pageX && e.pageY === t.pageY : "clientX" in t && "clientY" in t && e.clientX === t.clientX && e.clientY === t.clientY);
}
function st(e, t) {
  if (e !== document.activeElement && (0, g.Z)(t, e) && typeof e.focus === "function") {
    e.focus();
  }
}
function ut(e, t) {
  var r = null;
  var n = null;
  function i(e) {
    var i = (0, C.Z)(e, 1);
    var o = i[0].target;
    if (document.documentElement.contains(o)) {
      var a = o.getBoundingClientRect();
      var s = a.width;
      var u = a.height;
      var l = Math.floor(s);
      var c = Math.floor(u);
      if (r !== l || n !== c) {
        Promise.resolve().then(function () {
          t({
            width: l,
            height: c
          });
        });
      }
      r = l;
      n = c;
    }
  }
  var o = new ot.default(i);
  if (e) {
    o.observe(e);
  }
  return function () {
    o.disconnect();
  };
}
function lt(e) {
  if (typeof e !== "function") {
    return null;
  } else {
    return e();
  }
}
function ct(e) {
  if ((0, N.Z)(e) === "object" && e) {
    return e;
  } else {
    return null;
  }
}
function pt(e, t) {
  var r = e.children;
  var n = e.disabled;
  var i = e.target;
  var o = e.align;
  var a = e.onAlign;
  var s = e.monitorWindowResize;
  var u = e.monitorBufferTime;
  var l = u === undefined ? 0 : u;
  var c = p.useRef({});
  var d = p.useRef();
  var f = p.Children.only(r);
  var g = p.useRef({});
  g.current.disabled = n;
  g.current.target = i;
  g.current.align = o;
  g.current.onAlign = a;
  var m = it(function () {
    var e = g.current;
    var t = e.disabled;
    var r = e.target;
    var n = e.align;
    var i = e.onAlign;
    var o = d.current;
    if (!t && r && o) {
      var a;
      var s = lt(r);
      var u = ct(r);
      c.current.element = s;
      c.current.point = u;
      c.current.align = n;
      var l = document;
      var p = l.activeElement;
      if (s && (0, rt.Z)(s)) {
        a = Xe(o, s, n);
      } else if (u) {
        a = et(o, u, n);
      }
      st(p, o);
      if (i && a) {
        i(o, a);
      }
      return true;
    }
    return false;
  }, l);
  var h = (0, C.Z)(m, 2);
  var b = h[0];
  var w = h[1];
  var x = p.useState();
  var E = (0, C.Z)(x, 2);
  var k = E[0];
  var S = E[1];
  var T = p.useState();
  var A = (0, C.Z)(T, 2);
  var _ = A[0];
  var O = A[1];
  (0, nt.Z)(function () {
    S(lt(i));
    O(ct(i));
  });
  p.useEffect(function () {
    if (c.current.element !== k || !at(c.current.point, _) || !(0, tt.Z)(c.current.align, o)) {
      b();
    }
  });
  p.useEffect(function () {
    var e = ut(d.current, b);
    return e;
  }, [d.current]);
  p.useEffect(function () {
    var e = ut(k, b);
    return e;
  }, [k]);
  p.useEffect(function () {
    if (n) {
      w();
    } else {
      b();
    }
  }, [n]);
  p.useEffect(function () {
    if (s) {
      var e = (0, y.Z)(window, "resize", b);
      return e.remove;
    }
  }, [s]);
  p.useEffect(function () {
    return function () {
      w();
    };
  }, []);
  p.useImperativeHandle(t, function () {
    return {
      forceAlign: function () {
        return b(true);
      }
    };
  });
  if (p.isValidElement(f)) {
    f = p.cloneElement(f, {
      ref: (0, v.sQ)(f.ref, d)
    });
  }
  return f;
}
var dt = p.forwardRef(pt);
dt.displayName = "Align";
var ft = dt;
var gt = ft;
var mt = require("./92145.js");
var vt = require("./23639.js");
var yt = require("./64515.js");
var ht = ["measure", "alignPre", "align", null, "motion"];
function bt(e, t) {
  var r = (0, yt.Z)(null);
  var n = (0, C.Z)(r, 2);
  var i = n[0];
  var o = n[1];
  var a = (0, p.useRef)();
  function s(e) {
    o(e, true);
  }
  function u() {
    f.Z.cancel(a.current);
  }
  function l(e) {
    u();
    a.current = (0, f.Z)(function () {
      s(function (e) {
        switch (i) {
          case "align":
            return "motion";
          case "motion":
            return "stable";
          default:
        }
        return e;
      });
      if (e !== null && e !== undefined) {
        e();
      }
    });
  }
  (0, p.useEffect)(function () {
    s("measure");
  }, [e]);
  (0, p.useEffect)(function () {
    switch (i) {
      case "measure":
        t();
        break;
      default:
    }
    if (i) {
      a.current = (0, f.Z)((0, vt.Z)((0, mt.Z)().mark(function e() {
        var t;
        var r;
        return (0, mt.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                t = ht.indexOf(i);
                r = ht[t + 1];
                if (r && t !== -1) {
                  s(r);
                }
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e);
      })));
    }
  }, [i]);
  (0, p.useEffect)(function () {
    return function () {
      u();
    };
  }, []);
  return [i, l];
}
function wt(e) {
  var t = p.useState({
    width: 0,
    height: 0
  });
  var r = (0, C.Z)(t, 2);
  var n = r[0];
  var i = r[1];
  function o(e) {
    var t = e.offsetWidth;
    var r = e.offsetHeight;
    var n = e.getBoundingClientRect();
    var o = n.width;
    var a = n.height;
    if (Math.abs(t - o) < 1 && Math.abs(r - a) < 1) {
      t = o;
      r = a;
    }
    i({
      width: t,
      height: r
    });
  }
  var a = p.useMemo(function () {
    var t = {};
    if (e) {
      var r = n.width;
      var i = n.height;
      if (e.indexOf("height") !== -1 && i) {
        t.height = i;
      } else if (e.indexOf("minHeight") !== -1 && i) {
        t.minHeight = i;
      }
      if (e.indexOf("width") !== -1 && r) {
        t.width = r;
      } else if (e.indexOf("minWidth") !== -1 && r) {
        t.minWidth = r;
      }
    }
    return t;
  }, [e, n]);
  return [a, o];
}
var xt = p.forwardRef(function (e, t) {
  var r = e.visible;
  var o = e.prefixCls;
  var a = e.className;
  var s = e.style;
  var u = e.children;
  var l = e.zIndex;
  var c = e.stretch;
  var d = e.destroyPopupOnHide;
  var f = e.forceRender;
  var g = e.align;
  var m = e.point;
  var v = e.getRootDomNode;
  var y = e.getClassNameFromAlign;
  var h = e.onAlign;
  var b = e.onMouseEnter;
  var w = e.onMouseLeave;
  var x = e.onMouseDown;
  var k = e.onTouchStart;
  var S = e.onClick;
  var T = (0, p.useRef)();
  var A = (0, p.useRef)();
  var _ = (0, p.useState)();
  var P = (0, C.Z)(_, 2);
  var q = P[0];
  var N = P[1];
  var R = wt(c);
  var I = (0, C.Z)(R, 2);
  var j = I[0];
  var D = I[1];
  function L() {
    if (c) {
      D(v());
    }
  }
  var F = bt(r, L);
  var Z = (0, C.Z)(F, 2);
  var z = Z[0];
  var U = Z[1];
  var B = (0, p.useState)(0);
  var V = (0, C.Z)(B, 2);
  var H = V[0];
  var W = V[1];
  var Y = (0, p.useRef)();
  function Q() {
    return m || v;
  }
  function $() {
    var e;
    if ((e = T.current) !== null && e !== undefined) {
      e.forceAlign();
    }
  }
  function G(e, t) {
    var r = y(t);
    if (q !== r) {
      N(r);
    }
    W(function (e) {
      return e + 1;
    });
    if (z === "align") {
      if (h !== null && h !== undefined) {
        h(e, t);
      }
    }
  }
  (0, nt.Z)(function () {
    if (z === "alignPre") {
      W(0);
    }
  }, [z]);
  (0, nt.Z)(function () {
    if (z === "align") {
      if (H < 3) {
        $();
      } else {
        U(function () {
          var e;
          if ((e = Y.current) !== null && e !== undefined) {
            e.call(Y);
          }
        });
      }
    }
  }, [H]);
  var K = (0, n.Z)({}, M(e));
  function J() {
    return new Promise(function (e) {
      Y.current = e;
    });
  }
  ["onAppearEnd", "onEnterEnd", "onLeaveEnd"].forEach(function (e) {
    var t = K[e];
    K[e] = function (e, r) {
      U();
      if (t === null || t === undefined) {
        return undefined;
      } else {
        return t(e, r);
      }
    };
  });
  p.useEffect(function () {
    if (!K.motionName && z === "motion") {
      U();
    }
  }, [K.motionName, z]);
  p.useImperativeHandle(t, function () {
    return {
      forceAlign: $,
      getElement: function () {
        return A.current;
      }
    };
  });
  var X = (0, n.Z)((0, n.Z)({}, j), {}, {
    zIndex: l,
    opacity: z !== "motion" && z !== "stable" && r ? 0 : undefined,
    pointerEvents: r || z === "stable" ? undefined : "none"
  }, s);
  var ee = true;
  if (g !== null && g !== undefined && !!g.points && (z === "align" || z === "stable")) {
    ee = false;
  }
  var te = u;
  if (p.Children.count(u) > 1) {
    te = p.createElement("div", {
      className: `${o}-content`
    }, u);
  }
  return p.createElement(O.default, (0, i.Z)({
    visible: r,
    ref: A,
    leavedClassName: `${o}-hidden`
  }, K, {
    onAppearPrepare: J,
    onEnterPrepare: J,
    removeOnLeave: d,
    forceRender: f
  }), function (e, t) {
    var r = e.className;
    var i = e.style;
    var s = E(o, a, q, r);
    return p.createElement(gt, {
      target: Q(),
      key: "popup",
      ref: T,
      monitorWindowResize: true,
      disabled: ee,
      align: g,
      onAlign: G
    }, p.createElement("div", {
      ref: t,
      className: s,
      onMouseEnter: b,
      onMouseLeave: w,
      onMouseDownCapture: x,
      onTouchStartCapture: k,
      onClick: S,
      style: (0, n.Z)((0, n.Z)({}, i), X)
    }, te));
  });
});
xt.displayName = "PopupInner";
var Et = xt;
var kt = p.forwardRef(function (e, t) {
  var r = e.prefixCls;
  var o = e.visible;
  var a = e.zIndex;
  var s = e.children;
  var u = e.mobile;
  u = u === undefined ? {} : u;
  var l = u.popupClassName;
  var c = u.popupStyle;
  var d = u.popupMotion;
  var f = d === undefined ? {} : d;
  var g = u.popupRender;
  var m = e.onClick;
  var v = p.useRef();
  p.useImperativeHandle(t, function () {
    return {
      forceAlign: function () {},
      getElement: function () {
        return v.current;
      }
    };
  });
  var y = (0, n.Z)({
    zIndex: a
  }, c);
  var h = s;
  if (p.Children.count(s) > 1) {
    h = p.createElement("div", {
      className: `${r}-content`
    }, s);
  }
  if (g) {
    h = g(h);
  }
  return p.createElement(O.default, (0, i.Z)({
    visible: o,
    ref: v,
    removeOnLeave: true
  }, f), function (e, t) {
    var i = e.className;
    var o = e.style;
    var a = E(r, l, i);
    return p.createElement("div", {
      ref: t,
      className: a,
      onClick: m,
      style: (0, n.Z)((0, n.Z)({}, o), y)
    }, h);
  });
});
kt.displayName = "MobilePopupInner";
var St = kt;
var Tt = ["visible", "mobile"];
var Ct = p.forwardRef(function (e, t) {
  var r = e.visible;
  var o = e.mobile;
  var a = (0, A.Z)(e, Tt);
  var s = (0, p.useState)(r);
  var u = (0, C.Z)(s, 2);
  var l = u[0];
  var c = u[1];
  var d = (0, p.useState)(false);
  var f = (0, C.Z)(d, 2);
  var g = f[0];
  var m = f[1];
  var v = (0, n.Z)((0, n.Z)({}, a), {}, {
    visible: l
  });
  (0, p.useEffect)(function () {
    c(r);
    if (r && o) {
      m((0, _.Z)());
    }
  }, [r, o]);
  var y = g ? p.createElement(St, (0, i.Z)({}, v, {
    mobile: o,
    ref: t
  })) : p.createElement(Et, (0, i.Z)({}, v, {
    ref: t
  }));
  return p.createElement("div", null, p.createElement(P, v), y);
});
Ct.displayName = "Popup";
var At = Ct;
var _t = p.createContext(null);
var Ot = _t;
function Mt() {}
function Pt() {
  return "";
}
function qt(e) {
  if (e) {
    return e.ownerDocument;
  } else {
    return window.document;
  }
}
var Nt = ["onClick", "onMouseDown", "onTouchStart", "onMouseEnter", "onMouseLeave", "onFocus", "onBlur", "onContextMenu"];
function Rt(e) {
  var t = function (t) {
    (0, u.Z)(h, t);
    var r = (0, l.Z)(h);
    function h(e) {
      var t;
      var n;
      (0, o.Z)(this, h);
      t = r.call(this, e);
      (0, c.Z)((0, s.Z)(t), "popupRef", p.createRef());
      (0, c.Z)((0, s.Z)(t), "triggerRef", p.createRef());
      (0, c.Z)((0, s.Z)(t), "portalContainer", undefined);
      (0, c.Z)((0, s.Z)(t), "attachId", undefined);
      (0, c.Z)((0, s.Z)(t), "clickOutsideHandler", undefined);
      (0, c.Z)((0, s.Z)(t), "touchOutsideHandler", undefined);
      (0, c.Z)((0, s.Z)(t), "contextMenuOutsideHandler1", undefined);
      (0, c.Z)((0, s.Z)(t), "contextMenuOutsideHandler2", undefined);
      (0, c.Z)((0, s.Z)(t), "mouseDownTimeout", undefined);
      (0, c.Z)((0, s.Z)(t), "focusTime", undefined);
      (0, c.Z)((0, s.Z)(t), "preClickTime", undefined);
      (0, c.Z)((0, s.Z)(t), "preTouchTime", undefined);
      (0, c.Z)((0, s.Z)(t), "delayTimer", undefined);
      (0, c.Z)((0, s.Z)(t), "hasPopupMouseDown", undefined);
      (0, c.Z)((0, s.Z)(t), "onMouseEnter", function (e) {
        var r = t.props.mouseEnterDelay;
        t.fireEvents("onMouseEnter", e);
        t.delaySetPopupVisible(true, r, r ? null : e);
      });
      (0, c.Z)((0, s.Z)(t), "onMouseMove", function (e) {
        t.fireEvents("onMouseMove", e);
        t.setPoint(e);
      });
      (0, c.Z)((0, s.Z)(t), "onMouseLeave", function (e) {
        t.fireEvents("onMouseLeave", e);
        t.delaySetPopupVisible(false, t.props.mouseLeaveDelay);
      });
      (0, c.Z)((0, s.Z)(t), "onPopupMouseEnter", function () {
        t.clearDelayTimer();
      });
      (0, c.Z)((0, s.Z)(t), "onPopupMouseLeave", function (e) {
        var r;
        if (!e.relatedTarget || !!e.relatedTarget.setTimeout || !(0, g.Z)((r = t.popupRef.current) === null || r === undefined ? undefined : r.getElement(), e.relatedTarget)) {
          t.delaySetPopupVisible(false, t.props.mouseLeaveDelay);
        }
      });
      (0, c.Z)((0, s.Z)(t), "onFocus", function (e) {
        t.fireEvents("onFocus", e);
        t.clearDelayTimer();
        if (t.isFocusToShow()) {
          t.focusTime = Date.now();
          t.delaySetPopupVisible(true, t.props.focusDelay);
        }
      });
      (0, c.Z)((0, s.Z)(t), "onMouseDown", function (e) {
        t.fireEvents("onMouseDown", e);
        t.preClickTime = Date.now();
      });
      (0, c.Z)((0, s.Z)(t), "onTouchStart", function (e) {
        t.fireEvents("onTouchStart", e);
        t.preTouchTime = Date.now();
      });
      (0, c.Z)((0, s.Z)(t), "onBlur", function (e) {
        t.fireEvents("onBlur", e);
        t.clearDelayTimer();
        if (t.isBlurToHide()) {
          t.delaySetPopupVisible(false, t.props.blurDelay);
        }
      });
      (0, c.Z)((0, s.Z)(t), "onContextMenu", function (e) {
        e.preventDefault();
        t.fireEvents("onContextMenu", e);
        t.setPopupVisible(true, e);
      });
      (0, c.Z)((0, s.Z)(t), "onContextMenuClose", function () {
        if (t.isContextMenuToShow()) {
          t.close();
        }
      });
      (0, c.Z)((0, s.Z)(t), "onClick", function (e) {
        t.fireEvents("onClick", e);
        if (t.focusTime) {
          var r;
          if (t.preClickTime && t.preTouchTime) {
            r = Math.min(t.preClickTime, t.preTouchTime);
          } else if (t.preClickTime) {
            r = t.preClickTime;
          } else if (t.preTouchTime) {
            r = t.preTouchTime;
          }
          if (Math.abs(r - t.focusTime) < 20) {
            return;
          }
          t.focusTime = 0;
        }
        t.preClickTime = 0;
        t.preTouchTime = 0;
        if (t.isClickToShow() && (t.isClickToHide() || t.isBlurToHide()) && e && e.preventDefault) {
          e.preventDefault();
        }
        var n = !t.state.popupVisible;
        if (t.isClickToHide() && !n || n && t.isClickToShow()) {
          t.setPopupVisible(!t.state.popupVisible, e);
        }
      });
      (0, c.Z)((0, s.Z)(t), "onPopupMouseDown", function () {
        var e;
        t.hasPopupMouseDown = true;
        clearTimeout(t.mouseDownTimeout);
        t.mouseDownTimeout = window.setTimeout(function () {
          t.hasPopupMouseDown = false;
        }, 0);
        if (t.context) {
          (e = t.context).onPopupMouseDown.apply(e, arguments);
        }
      });
      (0, c.Z)((0, s.Z)(t), "onDocumentClick", function (e) {
        if (!t.props.mask || t.props.maskClosable) {
          var r = e.target;
          var n = t.getRootDomNode();
          var i = t.getPopupDomNode();
          if ((!(0, g.Z)(n, r) || !!t.isContextMenuOnly()) && !(0, g.Z)(i, r) && !t.hasPopupMouseDown) {
            t.close();
          }
        }
      });
      (0, c.Z)((0, s.Z)(t), "getRootDomNode", function () {
        var e = t.props.getTriggerDOMNode;
        if (e) {
          return e(t.triggerRef.current);
        }
        try {
          var r = (0, m.Z)(t.triggerRef.current);
          if (r) {
            return r;
          }
        } catch (n) {}
        return d.findDOMNode((0, s.Z)(t));
      });
      (0, c.Z)((0, s.Z)(t), "getPopupClassNameFromAlign", function (e) {
        var r = [];
        var n = t.props;
        var i = n.popupPlacement;
        var o = n.builtinPlacements;
        var a = n.prefixCls;
        var s = n.alignPoint;
        var u = n.getPopupClassNameFromAlign;
        if (i && o) {
          r.push(T(o, a, e, s));
        }
        if (u) {
          r.push(u(e));
        }
        return r.join(" ");
      });
      (0, c.Z)((0, s.Z)(t), "getComponent", function () {
        var e = t.props;
        var r = e.prefixCls;
        var n = e.destroyPopupOnHide;
        var o = e.popupClassName;
        var a = e.onPopupAlign;
        var s = e.popupMotion;
        var u = e.popupAnimation;
        var l = e.popupTransitionName;
        var c = e.popupStyle;
        var d = e.mask;
        var f = e.maskAnimation;
        var g = e.maskTransitionName;
        var m = e.maskMotion;
        var v = e.zIndex;
        var y = e.popup;
        var h = e.stretch;
        var b = e.alignPoint;
        var w = e.mobile;
        var x = e.forceRender;
        var E = e.onPopupClick;
        var k = t.state;
        var S = k.popupVisible;
        var T = k.point;
        var C = t.getPopupAlign();
        var A = {};
        if (t.isMouseEnterToShow()) {
          A.onMouseEnter = t.onPopupMouseEnter;
        }
        if (t.isMouseLeaveToHide()) {
          A.onMouseLeave = t.onPopupMouseLeave;
        }
        A.onMouseDown = t.onPopupMouseDown;
        A.onTouchStart = t.onPopupMouseDown;
        return p.createElement(At, (0, i.Z)({
          prefixCls: r,
          destroyPopupOnHide: n,
          visible: S,
          point: b && T,
          className: o,
          align: C,
          onAlign: a,
          animation: u,
          getClassNameFromAlign: t.getPopupClassNameFromAlign
        }, A, {
          stretch: h,
          getRootDomNode: t.getRootDomNode,
          style: c,
          mask: d,
          zIndex: v,
          transitionName: l,
          maskAnimation: f,
          maskTransitionName: g,
          maskMotion: m,
          ref: t.popupRef,
          motion: s,
          mobile: w,
          forceRender: x,
          onClick: E
        }), typeof y === "function" ? y() : y);
      });
      (0, c.Z)((0, s.Z)(t), "attachParent", function (e) {
        f.Z.cancel(t.attachId);
        var r;
        var n = t.props;
        var i = n.getPopupContainer;
        var o = n.getDocument;
        var a = t.getRootDomNode();
        if (i) {
          if (a || i.length === 0) {
            r = i(a);
          }
        } else {
          r = o(t.getRootDomNode()).body;
        }
        if (r) {
          r.appendChild(e);
        } else {
          t.attachId = (0, f.Z)(function () {
            t.attachParent(e);
          });
        }
      });
      (0, c.Z)((0, s.Z)(t), "getContainer", function () {
        if (!t.portalContainer) {
          var e = t.props.getDocument;
          var r = e(t.getRootDomNode()).createElement("div");
          r.style.position = "absolute";
          r.style.top = "0";
          r.style.left = "0";
          r.style.width = "100%";
          t.portalContainer = r;
        }
        t.attachParent(t.portalContainer);
        return t.portalContainer;
      });
      (0, c.Z)((0, s.Z)(t), "setPoint", function (e) {
        var r = t.props.alignPoint;
        if (r && e) {
          t.setState({
            point: {
              pageX: e.pageX,
              pageY: e.pageY
            }
          });
        }
      });
      (0, c.Z)((0, s.Z)(t), "handlePortalUpdate", function () {
        if (t.state.prevPopupVisible !== t.state.popupVisible) {
          t.props.afterPopupVisibleChange(t.state.popupVisible);
        }
      });
      (0, c.Z)((0, s.Z)(t), "triggerContextValue", {
        onPopupMouseDown: t.onPopupMouseDown
      });
      n = "popupVisible" in e ? !!e.popupVisible : !!e.defaultPopupVisible;
      t.state = {
        prevPopupVisible: n,
        popupVisible: n
      };
      Nt.forEach(function (e) {
        t[`fire${e}`] = function (r) {
          t.fireEvents(e, r);
        };
      });
      return t;
    }
    (0, a.Z)(h, [{
      key: "componentDidMount",
      value: function () {
        this.componentDidUpdate();
      }
    }, {
      key: "componentDidUpdate",
      value: function () {
        var e;
        var t = this.props;
        var r = this.state;
        if (r.popupVisible) {
          if (!this.clickOutsideHandler && (!!this.isClickToHide() || !!this.isContextMenuToShow())) {
            e = t.getDocument(this.getRootDomNode());
            this.clickOutsideHandler = (0, y.Z)(e, "mousedown", this.onDocumentClick);
          }
          if (!this.touchOutsideHandler) {
            e = e || t.getDocument(this.getRootDomNode());
            this.touchOutsideHandler = (0, y.Z)(e, "touchstart", this.onDocumentClick);
          }
          if (!this.contextMenuOutsideHandler1 && this.isContextMenuToShow()) {
            e = e || t.getDocument(this.getRootDomNode());
            this.contextMenuOutsideHandler1 = (0, y.Z)(e, "scroll", this.onContextMenuClose);
          }
          if (!this.contextMenuOutsideHandler2 && this.isContextMenuToShow()) {
            this.contextMenuOutsideHandler2 = (0, y.Z)(window, "blur", this.onContextMenuClose);
          }
          return;
        }
        this.clearOutsideHandler();
      }
    }, {
      key: "componentWillUnmount",
      value: function () {
        this.clearDelayTimer();
        this.clearOutsideHandler();
        clearTimeout(this.mouseDownTimeout);
        f.Z.cancel(this.attachId);
      }
    }, {
      key: "getPopupDomNode",
      value: function () {
        var e;
        return ((e = this.popupRef.current) === null || e === undefined ? undefined : e.getElement()) || null;
      }
    }, {
      key: "getPopupAlign",
      value: function () {
        var e = this.props;
        var t = e.popupPlacement;
        var r = e.popupAlign;
        var n = e.builtinPlacements;
        if (t && n) {
          return S(n, t, r);
        } else {
          return r;
        }
      }
    }, {
      key: "setPopupVisible",
      value: function (e, t) {
        var r = this.props.alignPoint;
        var n = this.state.popupVisible;
        this.clearDelayTimer();
        if (n !== e) {
          if (!("popupVisible" in this.props)) {
            this.setState({
              popupVisible: e,
              prevPopupVisible: n
            });
          }
          this.props.onPopupVisibleChange(e);
        }
        if (r && t && e) {
          this.setPoint(t);
        }
      }
    }, {
      key: "delaySetPopupVisible",
      value: function (e, t, r) {
        var n = this;
        var i = t * 1000;
        this.clearDelayTimer();
        if (i) {
          var o = r ? {
            pageX: r.pageX,
            pageY: r.pageY
          } : null;
          this.delayTimer = window.setTimeout(function () {
            n.setPopupVisible(e, o);
            n.clearDelayTimer();
          }, i);
        } else {
          this.setPopupVisible(e, r);
        }
      }
    }, {
      key: "clearDelayTimer",
      value: function () {
        if (this.delayTimer) {
          clearTimeout(this.delayTimer);
          this.delayTimer = null;
        }
      }
    }, {
      key: "clearOutsideHandler",
      value: function () {
        if (this.clickOutsideHandler) {
          this.clickOutsideHandler.remove();
          this.clickOutsideHandler = null;
        }
        if (this.contextMenuOutsideHandler1) {
          this.contextMenuOutsideHandler1.remove();
          this.contextMenuOutsideHandler1 = null;
        }
        if (this.contextMenuOutsideHandler2) {
          this.contextMenuOutsideHandler2.remove();
          this.contextMenuOutsideHandler2 = null;
        }
        if (this.touchOutsideHandler) {
          this.touchOutsideHandler.remove();
          this.touchOutsideHandler = null;
        }
      }
    }, {
      key: "createTwoChains",
      value: function (e) {
        var t = this.props.children.props;
        var r = this.props;
        if (t[e] && r[e]) {
          return this[`fire${e}`];
        } else {
          return t[e] || r[e];
        }
      }
    }, {
      key: "isClickToShow",
      value: function () {
        var e = this.props;
        var t = e.action;
        var r = e.showAction;
        return t.indexOf("click") !== -1 || r.indexOf("click") !== -1;
      }
    }, {
      key: "isContextMenuOnly",
      value: function () {
        var e = this.props.action;
        return e === "contextMenu" || e.length === 1 && e[0] === "contextMenu";
      }
    }, {
      key: "isContextMenuToShow",
      value: function () {
        var e = this.props;
        var t = e.action;
        var r = e.showAction;
        return t.indexOf("contextMenu") !== -1 || r.indexOf("contextMenu") !== -1;
      }
    }, {
      key: "isClickToHide",
      value: function () {
        var e = this.props;
        var t = e.action;
        var r = e.hideAction;
        return t.indexOf("click") !== -1 || r.indexOf("click") !== -1;
      }
    }, {
      key: "isMouseEnterToShow",
      value: function () {
        var e = this.props;
        var t = e.action;
        var r = e.showAction;
        return t.indexOf("hover") !== -1 || r.indexOf("mouseEnter") !== -1;
      }
    }, {
      key: "isMouseLeaveToHide",
      value: function () {
        var e = this.props;
        var t = e.action;
        var r = e.hideAction;
        return t.indexOf("hover") !== -1 || r.indexOf("mouseLeave") !== -1;
      }
    }, {
      key: "isFocusToShow",
      value: function () {
        var e = this.props;
        var t = e.action;
        var r = e.showAction;
        return t.indexOf("focus") !== -1 || r.indexOf("focus") !== -1;
      }
    }, {
      key: "isBlurToHide",
      value: function () {
        var e = this.props;
        var t = e.action;
        var r = e.hideAction;
        return t.indexOf("focus") !== -1 || r.indexOf("blur") !== -1;
      }
    }, {
      key: "forcePopupAlign",
      value: function () {
        var e;
        if (this.state.popupVisible) {
          if ((e = this.popupRef.current) !== null && e !== undefined) {
            e.forceAlign();
          }
        }
      }
    }, {
      key: "fireEvents",
      value: function (e, t) {
        var r = this.props.children.props[e];
        if (r) {
          r(t);
        }
        var n = this.props[e];
        if (n) {
          n(t);
        }
      }
    }, {
      key: "close",
      value: function () {
        this.setPopupVisible(false);
      }
    }, {
      key: "render",
      value: function () {
        var t = this.state.popupVisible;
        var r = this.props;
        var i = r.children;
        var o = r.forceRender;
        var a = r.alignPoint;
        var s = r.className;
        var u = r.autoDestroy;
        var l = p.Children.only(i);
        var c = {
          key: "trigger"
        };
        if (this.isContextMenuToShow()) {
          c.onContextMenu = this.onContextMenu;
        } else {
          c.onContextMenu = this.createTwoChains("onContextMenu");
        }
        if (this.isClickToHide() || this.isClickToShow()) {
          c.onClick = this.onClick;
          c.onMouseDown = this.onMouseDown;
          c.onTouchStart = this.onTouchStart;
        } else {
          c.onClick = this.createTwoChains("onClick");
          c.onMouseDown = this.createTwoChains("onMouseDown");
          c.onTouchStart = this.createTwoChains("onTouchStart");
        }
        if (this.isMouseEnterToShow()) {
          c.onMouseEnter = this.onMouseEnter;
          if (a) {
            c.onMouseMove = this.onMouseMove;
          }
        } else {
          c.onMouseEnter = this.createTwoChains("onMouseEnter");
        }
        if (this.isMouseLeaveToHide()) {
          c.onMouseLeave = this.onMouseLeave;
        } else {
          c.onMouseLeave = this.createTwoChains("onMouseLeave");
        }
        if (this.isFocusToShow() || this.isBlurToHide()) {
          c.onFocus = this.onFocus;
          c.onBlur = this.onBlur;
        } else {
          c.onFocus = this.createTwoChains("onFocus");
          c.onBlur = this.createTwoChains("onBlur");
        }
        var d = E(l && l.props && l.props.className, s);
        if (d) {
          c.className = d;
        }
        var f = (0, n.Z)({}, c);
        if ((0, v.Yr)(l)) {
          f.ref = (0, v.sQ)(this.triggerRef, l.ref);
        }
        var g;
        var m = p.cloneElement(l, f);
        if (t || this.popupRef.current || o) {
          g = p.createElement(e, {
            key: "portal",
            getContainer: this.getContainer,
            didUpdate: this.handlePortalUpdate
          }, this.getComponent());
        }
        if (!t && u) {
          g = null;
        }
        return p.createElement(Ot.Provider, {
          value: this.triggerContextValue
        }, m, g);
      }
    }], [{
      key: "getDerivedStateFromProps",
      value: function (e, t) {
        var r = e.popupVisible;
        var n = {};
        if (r !== undefined && t.popupVisible !== r) {
          n.popupVisible = r;
          n.prevPopupVisible = t.popupVisible;
        }
        return n;
      }
    }]);
    return h;
  }(p.Component);
  (0, c.Z)(t, "contextType", Ot);
  (0, c.Z)(t, "defaultProps", {
    prefixCls: "rc-trigger-popup",
    getPopupClassNameFromAlign: Pt,
    getDocument: qt,
    onPopupVisibleChange: Mt,
    afterPopupVisibleChange: Mt,
    onPopupAlign: Mt,
    popupClassName: "",
    mouseEnterDelay: 0,
    mouseLeaveDelay: 0.1,
    focusDelay: 0,
    blurDelay: 0.15,
    popupStyle: {},
    destroyPopupOnHide: false,
    popupAlign: {},
    defaultPopupVisible: false,
    mask: false,
    maskClosable: true,
    action: [],
    showAction: [],
    hideAction: [],
    autoDestroy: false
  });
  return t;
}
var It = Rt(w);
};
