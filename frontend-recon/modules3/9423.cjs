// webpack module 9423 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return qe;
  }
});
var n = require("./34256.js");
var i = require("./59496.js");
var o = require("./21487.js");
var a = require("./75728.js");
var s = require("./23874.js");
var u = require("./65332.js");
var l = require("./91613.js");
var c = require("./54079.js");
var p = require("./18268.js");
function d(e, t) {
  return i.createElement(p.Z, (0, l.Z)((0, l.Z)({}, e), {}, {
    ref: t,
    icon: c.Z
  }));
}
var f = i.forwardRef(d);
var g = f;
var m = require("./17338.js");
function v(e, t) {
  return i.createElement(p.Z, (0, l.Z)((0, l.Z)({}, e), {}, {
    ref: t,
    icon: m.Z
  }));
}
var y = i.forwardRef(v);
var h = y;
var b = require("./38399.js");
var w = b;
var x = require("./874.js");
var E = x;
var k = require("./60617.js");
var S = require("./3787.js");
var T = require("./88174.js");
var C = require("./47530.js");
var A = require("./91842.js");
var _ = require("./97969.js");
var O = require("./52520.js");
var M = require("./19486.js");
var P = require("./27193.js");
function q(e, t) {
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
var N = {
  border: 0,
  background: "transparent",
  padding: 0,
  lineHeight: "inherit",
  display: "inline-block"
};
var R = i.forwardRef(function (e, t) {
  function r(e) {
    var t = e.keyCode;
    if (t === P.Z.ENTER) {
      e.preventDefault();
    }
  }
  function o(t) {
    var r = t.keyCode;
    var n = e.onClick;
    if (r === P.Z.ENTER && n) {
      n();
    }
  }
  var a = e.style;
  var s = e.noStyle;
  var u = e.disabled;
  var l = q(e, ["style", "noStyle", "disabled"]);
  var c = {};
  if (!s) {
    c = (0, n.Z)({}, N);
  }
  if (u) {
    c.pointerEvents = "none";
  }
  c = (0, n.Z)((0, n.Z)({}, c), a);
  return i.createElement("div", (0, n.Z)({
    role: "button",
    tabIndex: 0,
    ref: t
  }, l, {
    onKeyDown: r,
    onKeyUp: o,
    style: c
  }));
});
var I = R;
var j = require("./5919.js");
var D = require("./31585.js");
var L = {
  icon: {
    tag: "svg",
    attrs: {
      viewBox: "64 64 896 896",
      focusable: "false"
    },
    children: [{
      tag: "path",
      attrs: {
        d: "M864 170h-60c-4.4 0-8 3.6-8 8v518H310v-73c0-6.7-7.8-10.5-13-6.3l-141.9 112a8 8 0 000 12.6l141.9 112c5.3 4.2 13 .4 13-6.3v-75h498c35.3 0 64-28.7 64-64V178c0-4.4-3.6-8-8-8z"
      }
    }]
  },
  name: "enter",
  theme: "outlined"
};
var F = L;
function Z(e, t) {
  return i.createElement(p.Z, (0, l.Z)((0, l.Z)({}, e), {}, {
    ref: t,
    icon: F
  }));
}
var z = i.forwardRef(Z);
var U = z;
var B = require("./9126.js");
var V = require("./40937.js");
function H(e) {
  var t = e.prefixCls;
  var r = e["aria-label"];
  var n = e.className;
  var a = e.style;
  var u = e.direction;
  var l = e.maxLength;
  var c = e.autoSize;
  var p = c === undefined || c;
  var d = e.value;
  var f = e.onSave;
  var g = e.onCancel;
  var m = e.onEnd;
  var v = e.component;
  var y = e.enterIcon;
  var h = y === undefined ? i.createElement(U, null) : y;
  var b = i.useRef(null);
  var x = i.useRef(false);
  var E = i.useRef();
  var k = i.useState(d);
  var S = (0, s.Z)(k, 2);
  var T = S[0];
  var C = S[1];
  i.useEffect(function () {
    C(d);
  }, [d]);
  i.useEffect(function () {
    if (b.current && b.current.resizableTextArea) {
      var e = b.current.resizableTextArea.textArea;
      e.focus();
      var t = e.value.length;
      e.setSelectionRange(t, t);
    }
  }, []);
  function A(e) {
    var t = e.target;
    C(t.value.replace(/[\n\r]/g, ""));
  }
  function _() {
    x.current = true;
  }
  function O() {
    x.current = false;
  }
  function M(e) {
    var t = e.keyCode;
    if (!x.current) {
      E.current = t;
    }
  }
  function q() {
    f(T.trim());
  }
  function N(e) {
    var t = e.keyCode;
    var r = e.ctrlKey;
    var n = e.altKey;
    var i = e.metaKey;
    var o = e.shiftKey;
    if (E.current === t && !x.current && !r && !n && !i && !o) {
      if (t === P.Z.ENTER) {
        q();
        if (m !== null && m !== undefined) {
          m();
        }
      } else if (t === P.Z.ESC) {
        g();
      }
    }
  }
  function R() {
    q();
  }
  var I = v ? `${t}-${v}` : "";
  var j = w(t, `${t}-edit-content`, (0, o.Z)({}, `${t}-rtl`, u === "rtl"), n, I);
  return i.createElement("div", {
    className: j,
    style: a
  }, i.createElement(B.Z, {
    ref: b,
    maxLength: l,
    value: T,
    onChange: A,
    onKeyDown: M,
    onKeyUp: N,
    onCompositionStart: _,
    onCompositionEnd: O,
    onBlur: R,
    "aria-label": r,
    rows: 1,
    autoSize: p
  }), h !== null ? (0, V.Tm)(h, {
    className: `${t}-edit-content-confirm`
  }) : null);
}
var W = H;
function Y(e, t) {
  return i.useMemo(function () {
    var r = !!e;
    return [r, (0, n.Z)((0, n.Z)({}, t), r && (0, a.Z)(e) === "object" ? e : null)];
  }, [e]);
}
function Q(e, t) {
  var r = i.useRef(false);
  i.useEffect(function () {
    if (r.current) {
      e();
    } else {
      r.current = true;
    }
  }, t);
}
var $ = Q;
function G(e, t) {
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
var K = i.forwardRef(function (e, t) {
  var r = e.prefixCls;
  var a = e.component;
  var s = a === undefined ? "article" : a;
  var u = e.className;
  var l = e.setContentRef;
  var c = e.children;
  var p = e.direction;
  var d = G(e, ["prefixCls", "component", "className", "setContentRef", "children", "direction"]);
  var f = i.useContext(O.E_);
  var g = f.getPrefixCls;
  var m = f.direction;
  var v = p ?? m;
  var y = t;
  if (l) {
    y = (0, _.sQ)(t, l);
  }
  var h = g("typography", r);
  var b = w(h, (0, o.Z)({}, `${h}-rtl`, v === "rtl"), u);
  return i.createElement(s, (0, n.Z)({
    className: b,
    ref: y
  }, d), c);
});
var J = K;
function X(e) {
  var t = (0, a.Z)(e);
  return t === "string" || t === "number";
}
function ee(e) {
  var t = 0;
  e.forEach(function (e) {
    if (X(e)) {
      t += String(e).length;
    } else {
      t += 1;
    }
  });
  return t;
}
function te(e, t) {
  var r = 0;
  var n = [];
  for (var i = 0; i < e.length; i += 1) {
    if (r === t) {
      return n;
    }
    var o = e[i];
    var a = X(o);
    var s = a ? String(o).length : 1;
    var u = r + s;
    if (u > t) {
      var l = t - r;
      n.push(String(o).slice(0, l));
      return n;
    }
    n.push(o);
    r = u;
  }
  return e;
}
var re = 0;
var ne = 1;
var ie = 2;
var oe = 3;
var ae = 4;
function se(e) {
  var t = e.enabledMeasure;
  var r = e.children;
  var o = e.text;
  var a = e.width;
  var u = e.fontSize;
  var l = e.rows;
  var c = e.onEllipsis;
  var p = i.useState([0, 0, 0]);
  var d = (0, s.Z)(p, 2);
  var f = (0, s.Z)(d[0], 3);
  var g = f[0];
  var m = f[1];
  var v = f[2];
  var y = d[1];
  var h = i.useState(re);
  var b = (0, s.Z)(h, 2);
  var w = b[0];
  var x = b[1];
  var E = i.useState(0);
  var k = (0, s.Z)(E, 2);
  var C = k[0];
  var A = k[1];
  var _ = i.useRef(null);
  var O = i.useRef(null);
  var M = i.useMemo(function () {
    return (0, S.Z)(o);
  }, [o]);
  var P = i.useMemo(function () {
    return ee(M);
  }, [M]);
  var q = i.useMemo(function () {
    if (t && w === oe) {
      return r(te(M, m), m < P);
    } else {
      return r(M, false);
    }
  }, [t, w, r, M, m, P]);
  (0, T.Z)(function () {
    if (t && a && u && P) {
      x(ne);
      y([0, Math.ceil(P / 2), P]);
    }
  }, [t, a, u, o, P, l]);
  (0, T.Z)(function () {
    if (w === ne) {
      A(_.current?.offsetHeight || 0);
    }
  }, [w]);
  (0, T.Z)(function () {
    if (C) {
      if (w === ne) {
        var r = O.current?.offsetHeight || 0;
        var n = l * C;
        if (r <= n) {
          x(ae);
          c(false);
        } else {
          x(ie);
        }
      } else if (w === ie) {
        if (g !== v) {
          var i = O.current?.offsetHeight || 0;
          var o = l * C;
          var a = g;
          var s = v;
          if (g === v - 1) {
            s = g;
          } else if (i <= o) {
            a = m;
          } else {
            s = m;
          }
          var u = Math.ceil((a + s) / 2);
          y([a, u, s]);
        } else {
          x(oe);
          c(true);
        }
      }
    }
  }, [w, g, v, l, C]);
  var N = {
    width: a,
    whiteSpace: "normal",
    margin: 0,
    padding: 0
  };
  function R(e, t, r) {
    return i.createElement("span", {
      "aria-hidden": true,
      ref: t,
      style: (0, n.Z)({
        position: "fixed",
        display: "block",
        left: 0,
        top: 0,
        zIndex: -9999,
        visibility: "hidden",
        pointerEvents: "none",
        fontSize: Math.floor(u / 2) * 2
      }, r)
    }, e);
  }
  function I(e, t) {
    var n = te(M, e);
    return R(r(n, true), t, N);
  }
  return i.createElement(i.Fragment, null, q, t && w !== oe && w !== ae && i.createElement(i.Fragment, null, R("lg", _, {
    wordBreak: "keep-all",
    whiteSpace: "nowrap"
  }), w === ne ? R(r(M, false), O, N) : I(m, O)));
}
var ue = se;
function le(e) {
  var t = e.enabledEllipsis;
  var r = e.isEllipsis;
  var o = e.children;
  var a = e.tooltipProps;
  if (a?.title && t) {
    return i.createElement(D.Z, (0, n.Z)({
      open: !!r && undefined
    }, a), o);
  } else {
    return o;
  }
}
var ce = le;
function pe(e, t) {
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
function de(e, t) {
  var r = e.mark;
  var n = e.code;
  var o = e.underline;
  var a = e.delete;
  var s = e.strong;
  var u = e.keyboard;
  var l = e.italic;
  var c = t;
  function p(e, t) {
    if (e) {
      c = i.createElement(t, {}, c);
    }
  }
  p(s, "strong");
  p(o, "u");
  p(a, "del");
  p(n, "code");
  p(r, "mark");
  p(u, "kbd");
  p(l, "i");
  return c;
}
function fe(e, t, r) {
  if (e === true || e === undefined) {
    return t;
  } else {
    return e || r && t;
  }
}
function ge(e) {
  if (e === false) {
    return [false, false];
  } else if (Array.isArray(e)) {
    return e;
  } else {
    return [e];
  }
}
var me = "...";
var ve = i.forwardRef(function (e, t) {
  var p = e.prefixCls;
  var d = e.className;
  var f = e.style;
  var m = e.type;
  var v = e.disabled;
  var y = e.children;
  var b = e.ellipsis;
  var x = e.editable;
  var P = e.copyable;
  var q = e.component;
  var N = e.title;
  var R = pe(e, ["prefixCls", "className", "style", "type", "disabled", "children", "ellipsis", "editable", "copyable", "component", "title"]);
  var L = i.useContext(O.E_);
  var F = L.getPrefixCls;
  var Z = L.direction;
  var z = (0, M.E)("Text")[0];
  var U = i.useRef(null);
  var B = i.useRef(null);
  var V = F("typography", p);
  var H = (0, A.Z)(R, ["mark", "code", "delete", "underline", "strong", "keyboard", "italic"]);
  var Q = Y(x);
  var G = (0, s.Z)(Q, 2);
  var K = G[0];
  var X = G[1];
  var ee = (0, C.Z)(false, {
    value: X.editing
  });
  var te = (0, s.Z)(ee, 2);
  var re = te[0];
  var ne = te[1];
  var ie = X.triggerType;
  var oe = ie === undefined ? ["icon"] : ie;
  function ae(e) {
    var t;
    if (e) {
      if ((t = X.onStart) !== null && t !== undefined) {
        t.call(X);
      }
    }
    ne(e);
  }
  $(function () {
    var e;
    if (!re && (e = B.current) !== null && e !== undefined) {
      e.focus();
    }
  }, [re]);
  function se(e) {
    if (e !== null && e !== undefined) {
      e.preventDefault();
    }
    ae(true);
  }
  function le(e) {
    var t;
    if ((t = X.onChange) !== null && t !== undefined) {
      t.call(X, e);
    }
    ae(false);
  }
  function ve() {
    var e;
    if ((e = X.onCancel) !== null && e !== undefined) {
      e.call(X);
    }
    ae(false);
  }
  var ye = Y(P);
  var he = (0, s.Z)(ye, 2);
  var be = he[0];
  var we = he[1];
  var xe = i.useState(false);
  var Ee = (0, s.Z)(xe, 2);
  var ke = Ee[0];
  var Se = Ee[1];
  var Te = i.useRef();
  var Ce = {};
  if (we.format) {
    Ce.format = we.format;
  }
  function Ae() {
    window.clearTimeout(Te.current);
  }
  function _e(e) {
    var t;
    if (e !== null && e !== undefined) {
      e.preventDefault();
    }
    if (e !== null && e !== undefined) {
      e.stopPropagation();
    }
    E(we.text || String(y) || "", Ce);
    Se(true);
    Ae();
    Te.current = window.setTimeout(function () {
      Se(false);
    }, 3000);
    if ((t = we.onCopy) !== null && t !== undefined) {
      t.call(we, e);
    }
  }
  i.useEffect(function () {
    return Ae;
  }, []);
  var Oe = i.useState(false);
  var Me = (0, s.Z)(Oe, 2);
  var Pe = Me[0];
  var qe = Me[1];
  var Ne = i.useState(false);
  var Re = (0, s.Z)(Ne, 2);
  var Ie = Re[0];
  var je = Re[1];
  var De = i.useState(false);
  var Le = (0, s.Z)(De, 2);
  var Fe = Le[0];
  var Ze = Le[1];
  var ze = i.useState(false);
  var Ue = (0, s.Z)(ze, 2);
  var Be = Ue[0];
  var Ve = Ue[1];
  var He = i.useState(false);
  var We = (0, s.Z)(He, 2);
  var Ye = We[0];
  var Qe = We[1];
  var $e = i.useState(true);
  var Ge = (0, s.Z)($e, 2);
  var Ke = Ge[0];
  var Je = Ge[1];
  var Xe = Y(b, {
    expandable: false
  });
  var et = (0, s.Z)(Xe, 2);
  var tt = et[0];
  var rt = et[1];
  var nt = tt && !Fe;
  var it = rt.rows;
  var ot = it === undefined ? 1 : it;
  var at = i.useMemo(function () {
    return !nt || rt.suffix !== undefined || rt.onEllipsis || rt.expandable || K || be;
  }, [nt, rt, K, be]);
  (0, T.Z)(function () {
    if (tt && !at) {
      qe((0, j.G)("webkitLineClamp"));
      je((0, j.G)("textOverflow"));
    }
  }, [at, tt]);
  var st = i.useMemo(function () {
    return !at && (ot === 1 ? Ie : Pe);
  }, [at, Ie, Pe]);
  var ut = nt && (st ? Ye : Be);
  var lt = nt && ot === 1 && st;
  var ct = nt && ot > 1 && st;
  function pt(e) {
    var t;
    Ze(true);
    if ((t = rt.onExpand) !== null && t !== undefined) {
      t.call(rt, e);
    }
  }
  var dt = i.useState(0);
  var ft = (0, s.Z)(dt, 2);
  var gt = ft[0];
  var mt = ft[1];
  var vt = i.useState(0);
  var yt = (0, s.Z)(vt, 2);
  var ht = yt[0];
  var bt = yt[1];
  function wt(e, t) {
    var r;
    var n = e.offsetWidth;
    mt(n);
    bt(parseInt((r = window.getComputedStyle) === null || r === undefined ? undefined : r.call(window, t).fontSize, 10) || 0);
  }
  function xt(e) {
    var t;
    Ve(e);
    if (Be !== e) {
      if ((t = rt.onEllipsis) !== null && t !== undefined) {
        t.call(rt, e);
      }
    }
  }
  i.useEffect(function () {
    var e = U.current;
    if (tt && st && e) {
      var t = ct ? e.offsetHeight < e.scrollHeight : e.offsetWidth < e.scrollWidth;
      if (Ye !== t) {
        Qe(t);
      }
    }
  }, [tt, st, y, ct, Ke]);
  i.useEffect(function () {
    var e = U.current;
    if (typeof IntersectionObserver !== "undefined" && e && st && nt) {
      var t = new IntersectionObserver(function () {
        Je(!!e.offsetParent);
      });
      t.observe(e);
      return function () {
        t.disconnect();
      };
    }
  }, [st, nt]);
  var Et = {};
  Et = rt.tooltip === true ? {
    title: X.text ?? y
  } : i.isValidElement(rt.tooltip) ? {
    title: rt.tooltip
  } : (0, a.Z)(rt.tooltip) === "object" ? (0, n.Z)({
    title: X.text ?? y
  }, rt.tooltip) : {
    title: rt.tooltip
  };
  var kt = i.useMemo(function () {
    function e(e) {
      return ["string", "number"].includes((0, a.Z)(e));
    }
    if (tt && !st) {
      if (e(X.text)) {
        return X.text;
      } else if (e(y)) {
        return y;
      } else if (e(N)) {
        return N;
      } else if (e(Et.title)) {
        return Et.title;
      } else {
        return undefined;
      }
    }
  }, [tt, st, N, Et.title, ut]);
  if (re) {
    return i.createElement(W, {
      value: X.text ?? (typeof y === "string" ? y : ""),
      onSave: le,
      onCancel: ve,
      onEnd: X.onEnd,
      prefixCls: V,
      className: d,
      style: f,
      direction: Z,
      component: q,
      maxLength: X.maxLength,
      autoSize: X.autoSize,
      enterIcon: X.enterIcon
    });
  }
  function St() {
    var e;
    var t = rt.expandable;
    var r = rt.symbol;
    if (t) {
      e = r || z.expand;
      return i.createElement("a", {
        key: "expand",
        className: `${V}-expand`,
        onClick: pt,
        "aria-label": z.expand
      }, e);
    } else {
      return null;
    }
  }
  function Tt() {
    if (K) {
      var e = X.icon;
      var t = X.tooltip;
      var r = (0, S.Z)(t)[0] || z.edit;
      var n = typeof r === "string" ? r : "";
      if (oe.includes("icon")) {
        return i.createElement(D.Z, {
          key: "edit",
          title: t === false ? "" : r
        }, i.createElement(I, {
          ref: B,
          className: `${V}-edit`,
          onClick: se,
          "aria-label": n
        }, e || i.createElement(h, {
          role: "button"
        })));
      } else {
        return null;
      }
    }
  }
  function Ct() {
    if (be) {
      var e = we.tooltips;
      var t = we.icon;
      var r = ge(e);
      var n = ge(t);
      var o = ke ? fe(r[1], z.copied) : fe(r[0], z.copy);
      var a = ke ? z.copied : z.copy;
      var s = typeof o === "string" ? o : a;
      return i.createElement(D.Z, {
        key: "copy",
        title: o
      }, i.createElement(I, {
        className: w(`${V}-copy`, ke && `${V}-copy-success`),
        onClick: _e,
        "aria-label": s
      }, ke ? fe(n[1], i.createElement(u.Z, null), true) : fe(n[0], i.createElement(g, null), true)));
    }
  }
  function At(e) {
    return [e && St(), Tt(), Ct()];
  }
  function _t(e) {
    return [e && i.createElement("span", {
      "aria-hidden": true,
      key: "ellipsis"
    }, me), rt.suffix, At(e)];
  }
  return i.createElement(k.Z, {
    onResize: wt,
    disabled: !nt || st
  }, function (r) {
    return i.createElement(ce, {
      tooltipProps: Et,
      enabledEllipsis: nt,
      isEllipsis: ut
    }, i.createElement(J, (0, n.Z)({
      className: w((0, o.Z)((0, o.Z)((0, o.Z)((0, o.Z)((0, o.Z)((0, o.Z)({}, `${V}-${m}`, m), `${V}-disabled`, v), `${V}-ellipsis`, tt), `${V}-single-line`, nt && ot === 1), `${V}-ellipsis-single-line`, lt), `${V}-ellipsis-multiple-line`, ct), d),
      prefixCls: p,
      style: (0, n.Z)((0, n.Z)({}, f), {
        WebkitLineClamp: ct ? ot : undefined
      }),
      component: q,
      ref: (0, _.sQ)(r, U, t),
      direction: Z,
      onClick: oe.includes("text") ? se : undefined,
      "aria-label": kt === null || kt === undefined ? undefined : kt.toString(),
      title: N
    }, H), i.createElement(ue, {
      enabledMeasure: nt && !st,
      text: y,
      rows: ot,
      width: gt,
      fontSize: ht,
      onEllipsis: xt
    }, function (t, r) {
      var n = t;
      if (t.length && r && kt) {
        n = i.createElement("span", {
          key: "show-content",
          "aria-hidden": true
        }, n);
      }
      var o = de(e, i.createElement(i.Fragment, null, n, _t(r)));
      return o;
    })));
  });
});
var ye = ve;
function he(e, t) {
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
var be = i.forwardRef(function (e, t) {
  var r = e.ellipsis;
  var o = e.rel;
  var a = he(e, ["ellipsis", "rel"]);
  var s = (0, n.Z)((0, n.Z)({}, a), {
    rel: o === undefined && a.target === "_blank" ? "noopener noreferrer" : o
  });
  delete s.navigate;
  return i.createElement(ye, (0, n.Z)({}, s, {
    ref: t,
    ellipsis: !!r,
    component: "a"
  }));
});
var we = be;
var xe = i.forwardRef(function (e, t) {
  return i.createElement(ye, (0, n.Z)({
    ref: t
  }, e, {
    component: "div"
  }));
});
var Ee = xe;
function ke(e, t) {
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
function Se(e, t) {
  var r = e.ellipsis;
  var o = ke(e, ["ellipsis"]);
  var s = i.useMemo(function () {
    if (r && (0, a.Z)(r) === "object") {
      return (0, A.Z)(r, ["expandable", "rows"]);
    } else {
      return r;
    }
  }, [r]);
  return i.createElement(ye, (0, n.Z)({
    ref: t
  }, o, {
    ellipsis: s,
    component: "span"
  }));
}
var Te = i.forwardRef(Se);
var Ce = require("./57431.js");
function Ae(e, t) {
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
var _e = (0, Ce.a)(1, 2, 3, 4, 5);
var Oe = i.forwardRef(function (e, t) {
  var r;
  var o = e.level;
  var a = o === undefined ? 1 : o;
  var s = Ae(e, ["level"]);
  r = _e.includes(a) ? `h${a}` : "h1";
  return i.createElement(ye, (0, n.Z)({
    ref: t
  }, s, {
    component: r
  }));
});
var Me = Oe;
var Pe = J;
Pe.Text = Te;
Pe.Link = we;
Pe.Title = Me;
Pe.Paragraph = Ee;
var qe = Pe;
};
