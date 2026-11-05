// webpack module 9126 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return ne;
  }
});
var n;
var i = require("./75728.js");
var o = require("./21487.js");
var a = require("./34256.js");
var s = require("./23874.js");
var u = require("./66439.js");
var l = require("./38399.js");
var c = l;
var p = require("./8951.js");
var d = require("./45810.js");
var f = require("./78212.js");
var g = require("./19746.js");
var m = require("./59496.js");
var v = require("./91613.js");
var y = require("./37913.js");
var h = require("./60617.js");
var b = require("./88174.js");
var w = require("./45406.js");
var x = require("./47530.js");
var E = "\n  min-height:0 !important;\n  max-height:none !important;\n  height:0 !important;\n  visibility:hidden !important;\n  overflow:hidden !important;\n  position:absolute !important;\n  z-index:-1000 !important;\n  top:0 !important;\n  right:0 !important;\n  pointer-events: none !important;\n";
var k = ["letter-spacing", "line-height", "padding-top", "padding-bottom", "font-family", "font-weight", "font-size", "font-variant", "text-rendering", "text-transform", "width", "text-indent", "padding-left", "padding-right", "border-width", "box-sizing", "word-break"];
var S = {};
function T(e, t = false) {
  var r = e.getAttribute("id") || e.getAttribute("data-reactid") || e.getAttribute("name");
  if (t && S[r]) {
    return S[r];
  }
  var n = window.getComputedStyle(e);
  var i = n.getPropertyValue("box-sizing") || n.getPropertyValue("-moz-box-sizing") || n.getPropertyValue("-webkit-box-sizing");
  var o = parseFloat(n.getPropertyValue("padding-bottom")) + parseFloat(n.getPropertyValue("padding-top"));
  var a = parseFloat(n.getPropertyValue("border-bottom-width")) + parseFloat(n.getPropertyValue("border-top-width"));
  var s = k.map(function (e) {
    return `${e}:${n.getPropertyValue(e)}`;
  }).join(";");
  var u = {
    sizingStyle: s,
    paddingSize: o,
    borderSize: a,
    boxSizing: i
  };
  if (t && r) {
    S[r] = u;
  }
  return u;
}
function C(e, t = false, r = null, i = null) {
  if (!n) {
    n = document.createElement("textarea");
    n.setAttribute("tab-index", "-1");
    n.setAttribute("aria-hidden", "true");
    document.body.appendChild(n);
  }
  if (e.getAttribute("wrap")) {
    n.setAttribute("wrap", e.getAttribute("wrap"));
  } else {
    n.removeAttribute("wrap");
  }
  var o = T(e, t);
  var a = o.paddingSize;
  var s = o.borderSize;
  var u = o.boxSizing;
  var l = o.sizingStyle;
  n.setAttribute("style", `${l};${E}`);
  n.value = e.value || e.placeholder || "";
  var c;
  var p = undefined;
  var d = undefined;
  var f = n.scrollHeight;
  if (u === "border-box") {
    f += s;
  } else if (u === "content-box") {
    f -= a;
  }
  if (r !== null || i !== null) {
    n.value = " ";
    var g = n.scrollHeight - a;
    if (r !== null) {
      p = g * r;
      if (u === "border-box") {
        p = p + a + s;
      }
      f = Math.max(p, f);
    }
    if (i !== null) {
      d = g * i;
      if (u === "border-box") {
        d = d + a + s;
      }
      c = f > d ? "" : "hidden";
      f = Math.min(d, f);
    }
  }
  var m = {
    height: f,
    overflowY: c,
    resize: "none"
  };
  if (p) {
    m.minHeight = p;
  }
  if (d) {
    m.maxHeight = d;
  }
  return m;
}
var A = ["prefixCls", "onPressEnter", "defaultValue", "value", "autoSize", "onResize", "className", "style", "disabled", "onChange", "onInternalAutoSize"];
var _ = 0;
var O = 1;
var M = 2;
var P = m.forwardRef(function (e, t) {
  var r = e.prefixCls;
  var n = r === undefined ? "rc-textarea" : r;
  e.onPressEnter;
  var u = e.defaultValue;
  var l = e.value;
  var p = e.autoSize;
  var d = e.onResize;
  var f = e.className;
  var g = e.style;
  var E = e.disabled;
  var k = e.onChange;
  e.onInternalAutoSize;
  var S = (0, y.Z)(e, A);
  var T = (0, x.Z)(u, {
    value: l,
    postState: function (e) {
      return e ?? "";
    }
  });
  var P = (0, s.Z)(T, 2);
  var q = P[0];
  var N = P[1];
  function R(e) {
    N(e.target.value);
    if (k !== null && k !== undefined) {
      k(e);
    }
  }
  var I = m.useRef();
  m.useImperativeHandle(t, function () {
    return {
      textArea: I.current
    };
  });
  var j = m.useMemo(function () {
    if (p && (0, i.Z)(p) === "object") {
      return [p.minRows, p.maxRows];
    } else {
      return [];
    }
  }, [p]);
  var D = (0, s.Z)(j, 2);
  var L = D[0];
  var F = D[1];
  var Z = !!p;
  function z() {
    try {
      if (document.activeElement === I.current) {
        var e = I.current;
        var t = e.selectionStart;
        var r = e.selectionEnd;
        var n = e.scrollTop;
        I.current.setSelectionRange(t, r);
        I.current.scrollTop = n;
      }
    } catch (i) {}
  }
  var U = m.useState(M);
  var B = (0, s.Z)(U, 2);
  var V = B[0];
  var H = B[1];
  var W = m.useState();
  var Y = (0, s.Z)(W, 2);
  var Q = Y[0];
  var $ = Y[1];
  function G() {
    H(_);
  }
  (0, b.Z)(function () {
    if (Z) {
      G();
    }
  }, [l, L, F, Z]);
  (0, b.Z)(function () {
    if (V === _) {
      H(O);
    } else if (V === O) {
      var e = C(I.current, false, L, F);
      H(M);
      $(e);
    } else {
      z();
    }
  }, [V]);
  var K = m.useRef();
  function J() {
    w.Z.cancel(K.current);
  }
  function X(e) {
    if (V === M) {
      if (d !== null && d !== undefined) {
        d(e);
      }
      if (p) {
        J();
        K.current = (0, w.Z)(function () {
          G();
        });
      }
    }
  }
  m.useEffect(function () {
    return J;
  }, []);
  var ee = Z ? Q : null;
  var te = (0, v.Z)((0, v.Z)({}, g), ee);
  if (V === _ || V === O) {
    te.overflowY = "hidden";
    te.overflowX = "hidden";
  }
  return m.createElement(h.Z, {
    onResize: X,
    disabled: !p && !d
  }, m.createElement("textarea", (0, a.Z)({}, S, {
    ref: I,
    style: te,
    className: c(n, f, (0, o.Z)({}, `${n}-disabled`, E)),
    disabled: E,
    value: q,
    onChange: R
  })));
});
var q = P;
var N = function (e) {
  (0, f.Z)(r, e);
  var t = (0, g.Z)(r);
  function r(e) {
    var n;
    (0, p.Z)(this, r);
    n = t.call(this, e);
    n.resizableTextArea = undefined;
    n.focus = function () {
      n.resizableTextArea.textArea.focus();
    };
    n.saveTextArea = function (e) {
      n.resizableTextArea = e;
    };
    n.handleChange = function (e) {
      var t = n.props.onChange;
      n.setValue(e.target.value);
      if (t) {
        t(e);
      }
    };
    n.handleKeyDown = function (e) {
      var t = n.props;
      var r = t.onPressEnter;
      var i = t.onKeyDown;
      if (e.keyCode === 13 && r) {
        r(e);
      }
      if (i) {
        i(e);
      }
    };
    var i = typeof e.value === "undefined" || e.value === null ? e.defaultValue : e.value;
    n.state = {
      value: i
    };
    return n;
  }
  (0, d.Z)(r, [{
    key: "setValue",
    value: function (e, t) {
      if (!("value" in this.props)) {
        this.setState({
          value: e
        }, t);
      }
    }
  }, {
    key: "blur",
    value: function () {
      this.resizableTextArea.textArea.blur();
    }
  }, {
    key: "render",
    value: function () {
      return m.createElement(q, (0, a.Z)({}, this.props, {
        value: this.state.value,
        onKeyDown: this.handleKeyDown,
        onChange: this.handleChange,
        ref: this.saveTextArea
      }));
    }
  }], [{
    key: "getDerivedStateFromProps",
    value: function (e) {
      if ("value" in e) {
        return {
          value: e.value
        };
      } else {
        return null;
      }
    }
  }]);
  return r;
}(m.Component);
var R = N;
var I = require("./91842.js");
var j = require("./52520.js");
var D = require("./89528.js");
var L = require("./77966.js");
var F = require("./2818.js");
var Z = require("./55518.js");
var z = require("./12683.js");
var U = require("./69926.js");
var B = require("./53691.js");
var V = require("./81741.js");
var H = require("./40937.js");
var W = require("./57431.js");
function Y(e, t, r) {
  t = (0, B.Z)(t);
  return (0, z.Z)(e, (0, U.Z)() ? Reflect.construct(t, r || [], (0, B.Z)(e).constructor) : t.apply(e, r));
}
var Q = (0, W.b)("text", "input");
function $(e) {
  return !!e.addonBefore || !!e.addonAfter;
}
var G = function (e) {
  function t() {
    (0, p.Z)(this, t);
    return Y(this, t, arguments);
  }
  (0, f.Z)(t, e);
  (0, d.Z)(t, [{
    key: "renderClearIcon",
    value: function (e) {
      var t = this.props;
      var r = t.value;
      var n = t.disabled;
      var i = t.readOnly;
      var a = t.handleReset;
      var s = t.suffix;
      var u = !n && !i && r;
      var l = `${e}-clear-icon`;
      return m.createElement(V.Z, {
        onClick: a,
        onMouseDown: function (e) {
          return e.preventDefault();
        },
        className: c((0, o.Z)((0, o.Z)({}, `${l}-hidden`, !u), `${l}-has-suffix`, !!s), l),
        role: "button"
      });
    }
  }, {
    key: "renderTextAreaWithClearIcon",
    value: function (e, t, r) {
      var n = this.props;
      var i = n.value;
      var a = n.allowClear;
      var s = n.className;
      var u = n.focused;
      var l = n.style;
      var p = n.direction;
      var d = n.bordered;
      var f = n.hidden;
      var g = n.status;
      var v = r.status;
      var y = r.hasFeedback;
      if (!a) {
        return (0, H.Tm)(t, {
          value: i
        });
      }
      var h = c(`${e}-affix-wrapper`, `${e}-affix-wrapper-textarea-with-clear-btn`, (0, Z.Z)(`${e}-affix-wrapper`, (0, Z.F)(v, g), y), (0, o.Z)((0, o.Z)((0, o.Z)((0, o.Z)({}, `${e}-affix-wrapper-focused`, u), `${e}-affix-wrapper-rtl`, p === "rtl"), `${e}-affix-wrapper-borderless`, !d), `${s}`, !$(this.props) && s));
      return m.createElement("span", {
        className: h,
        style: l,
        hidden: f
      }, (0, H.Tm)(t, {
        style: null,
        value: i
      }), this.renderClearIcon(e));
    }
  }, {
    key: "render",
    value: function () {
      var e = this;
      return m.createElement(F.aM.Consumer, null, function (t) {
        var r = e.props;
        var n = r.prefixCls;
        var i = r.inputType;
        var o = r.element;
        if (i === Q[0]) {
          return e.renderTextAreaWithClearIcon(n, o, t);
        }
      });
    }
  }]);
  return t;
}(m.Component);
var K = G;
var J = require("./27954.js");
function X(e, t) {
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
function ee(e, t) {
  return (0, u.Z)(e || "").slice(0, t).join("");
}
function te(e, t, r, n) {
  var i = r;
  if (e) {
    i = ee(r, n);
  } else if ((0, u.Z)(t || "").length < r.length && (0, u.Z)(r || "").length > n) {
    i = t;
  }
  return i;
}
var re = m.forwardRef(function (e, t) {
  var r = e.prefixCls;
  var n = e.bordered;
  var l = n === undefined || n;
  var p = e.showCount;
  var d = p !== undefined && p;
  var f = e.maxLength;
  var g = e.className;
  var v = e.style;
  var y = e.size;
  var h = e.disabled;
  var b = e.onCompositionStart;
  var w = e.onCompositionEnd;
  var E = e.onChange;
  var k = e.onFocus;
  var S = e.onBlur;
  var T = e.status;
  var C = X(e, ["prefixCls", "bordered", "showCount", "maxLength", "className", "style", "size", "disabled", "onCompositionStart", "onCompositionEnd", "onChange", "onFocus", "onBlur", "status"]);
  var A = m.useContext(j.E_);
  var _ = A.getPrefixCls;
  var O = A.direction;
  var M = m.useContext(L.Z);
  var P = m.useContext(D.Z);
  var q = h ?? P;
  var N = m.useContext(F.aM);
  var z = N.status;
  var U = N.hasFeedback;
  var B = N.isFormItemInput;
  var V = N.feedbackIcon;
  var H = (0, Z.F)(z, T);
  var W = m.useRef(null);
  var Y = m.useRef(null);
  var Q = m.useState(false);
  var $ = (0, s.Z)(Q, 2);
  var G = $[0];
  var re = $[1];
  var ne = m.useState(false);
  var ie = (0, s.Z)(ne, 2);
  var oe = ie[0];
  var ae = ie[1];
  var se = m.useRef();
  var ue = m.useRef(0);
  var le = (0, x.Z)(C.defaultValue, {
    value: C.value
  });
  var ce = (0, s.Z)(le, 2);
  var pe = ce[0];
  var de = ce[1];
  var fe = C.hidden;
  function ge(e, t) {
    if (C.value === undefined) {
      de(e);
      if (t !== null && t !== undefined) {
        t();
      }
    }
  }
  var me = Number(f) > 0;
  function ve(e) {
    re(true);
    se.current = pe;
    ue.current = e.currentTarget.selectionStart;
    if (b !== null && b !== undefined) {
      b(e);
    }
  }
  function ye(e) {
    re(false);
    var r = e.currentTarget.value;
    if (me) {
      var n = ue.current >= f + 1 || ue.current === se.current?.length;
      r = te(n, se.current, r, f);
    }
    if (r !== pe) {
      ge(r);
      (0, J.rJ)(e.currentTarget, e, E, r);
    }
    if (w !== null && w !== undefined) {
      w(e);
    }
  }
  function he(e) {
    var t = e.target.value;
    if (!G && me) {
      var r = e.target.selectionStart >= f + 1 || e.target.selectionStart === t.length || !e.target.selectionStart;
      t = te(r, pe, t, f);
    }
    ge(t);
    (0, J.rJ)(e.currentTarget, e, E, t);
  }
  function be(e) {
    ae(false);
    if (S !== null && S !== undefined) {
      S(e);
    }
  }
  function we(e) {
    ae(true);
    if (k !== null && k !== undefined) {
      k(e);
    }
  }
  m.useEffect(function () {
    ae(function (e) {
      return !q && e;
    });
  }, [q]);
  function xe(e) {
    var t;
    ge("");
    if ((t = W.current) !== null && t !== undefined) {
      t.focus();
    }
    (0, J.rJ)(W.current?.resizableTextArea?.textArea, e, E);
  }
  var Ee = _("input", r);
  m.useImperativeHandle(t, function () {
    return {
      resizableTextArea: W.current?.resizableTextArea,
      focus: function (e) {
        (0, J.nH)(W.current?.resizableTextArea?.textArea, e);
      },
      blur: function () {
        var e;
        if ((e = W.current) === null || e === undefined) {
          return undefined;
        } else {
          return e.blur();
        }
      }
    };
  });
  var ke = m.createElement(R, (0, a.Z)({}, (0, I.Z)(C, ["allowClear"]), {
    disabled: q,
    className: c((0, o.Z)((0, o.Z)((0, o.Z)((0, o.Z)({}, `${Ee}-borderless`, !l), g, g && !d), `${Ee}-sm`, M === "small" || y === "small"), `${Ee}-lg`, M === "large" || y === "large"), (0, Z.Z)(Ee, H)),
    style: d ? {
      resize: v?.resize
    } : v,
    prefixCls: Ee,
    onCompositionStart: ve,
    onChange: he,
    onBlur: be,
    onFocus: we,
    onCompositionEnd: ye,
    ref: W
  }));
  var Se = (0, J.D7)(pe);
  if (!G && !!me && (C.value === null || C.value === undefined)) {
    Se = ee(Se, f);
  }
  var Te = m.createElement(K, (0, a.Z)({
    disabled: q,
    focused: oe
  }, C, {
    prefixCls: Ee,
    direction: O,
    inputType: "text",
    value: Se,
    element: ke,
    handleReset: xe,
    ref: Y,
    bordered: l,
    status: T,
    style: d ? undefined : v
  }));
  if (d || U) {
    var Ce = (0, u.Z)(Se).length;
    var Ae = "";
    Ae = (0, i.Z)(d) === "object" ? d.formatter({
      value: Se,
      count: Ce,
      maxLength: f
    }) : `${Ce}${me ? ` / ${f}` : ""}`;
    return m.createElement("div", {
      hidden: fe,
      className: c(`${Ee}-textarea`, (0, o.Z)((0, o.Z)((0, o.Z)({}, `${Ee}-textarea-rtl`, O === "rtl"), `${Ee}-textarea-show-count`, d), `${Ee}-textarea-in-form-item`, B), (0, Z.Z)(`${Ee}-textarea`, H, U), g),
      style: v,
      "data-count": Ae
    }, Te, U && m.createElement("span", {
      className: `${Ee}-textarea-suffix`
    }, V));
  }
  return Te;
});
var ne = re;
};
