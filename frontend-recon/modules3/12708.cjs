// webpack module 12708 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  ZP: function () {
    return F;
  },
  w6: function () {
    return j;
  }
});
var n = require("./34256.js");
var i = require("./60816.js");
var o = require("./64057.js");
var a = require("./59496.js");
var s = require("./19889.js");
var u = require("./39202.js");
var l = require("./74008.js");
var c = require("./81454.js");
var p = "internalMark";
function d(e) {
  var t = e.locale;
  var r = t === undefined ? {} : t;
  var i = e.children;
  e._ANT_MARK__;
  a.useEffect(function () {
    (0, l.f)(r && r.Modal);
    return function () {
      (0, l.f)();
    };
  }, [r]);
  var o = a.useMemo(function () {
    return (0, n.Z)((0, n.Z)({}, r), {
      exist: true
    });
  }, [r]);
  return a.createElement(c.Z.Provider, {
    value: o
  }, i);
}
var f = d;
var g = require("./19486.js");
var m = require("./54502.js");
var v = require("./16179.js");
var y = require("./69450.js");
var h = require("./52520.js");
var b = require("./56088.js");
var w = require("./99978.js");
var x = require("./67361.js");
var E = require("./96417.js");
var k = `-ant-${Date.now()}-${Math.random()}`;
function S(e, t) {
  var r = {};
  function n(e, t) {
    var r = e.clone();
    r = (t === null || t === undefined ? undefined : t(r)) || r;
    return r.toRgbString();
  }
  function i(e, t) {
    var i = new w.C(e);
    var o = (0, b.generate)(i.toRgbString());
    r[`${t}-color`] = n(i);
    r[`${t}-color-disabled`] = o[1];
    r[`${t}-color-hover`] = o[4];
    r[`${t}-color-active`] = o[6];
    r[`${t}-color-outline`] = i.clone().setAlpha(0.2).toRgbString();
    r[`${t}-color-deprecated-bg`] = o[0];
    r[`${t}-color-deprecated-border`] = o[2];
  }
  if (t.primaryColor) {
    i(t.primaryColor, "primary");
    var o = new w.C(t.primaryColor);
    var a = (0, b.generate)(o.toRgbString());
    a.forEach(function (e, t) {
      r[`primary-${t + 1}`] = e;
    });
    r["primary-color-deprecated-l-35"] = n(o, function (e) {
      return e.lighten(35);
    });
    r["primary-color-deprecated-l-20"] = n(o, function (e) {
      return e.lighten(20);
    });
    r["primary-color-deprecated-t-20"] = n(o, function (e) {
      return e.tint(20);
    });
    r["primary-color-deprecated-t-50"] = n(o, function (e) {
      return e.tint(50);
    });
    r["primary-color-deprecated-f-12"] = n(o, function (e) {
      return e.setAlpha(e.getAlpha() * 0.12);
    });
    var s = new w.C(a[0]);
    r["primary-color-active-deprecated-f-30"] = n(s, function (e) {
      return e.setAlpha(e.getAlpha() * 0.3);
    });
    r["primary-color-active-deprecated-d-02"] = n(s, function (e) {
      return e.darken(2);
    });
  }
  if (t.successColor) {
    i(t.successColor, "success");
  }
  if (t.warningColor) {
    i(t.warningColor, "warning");
  }
  if (t.errorColor) {
    i(t.errorColor, "error");
  }
  if (t.infoColor) {
    i(t.infoColor, "info");
  }
  var u = Object.keys(r).map(function (t) {
    return `--${e}-${t}: ${r[t]};`;
  });
  return `
  :root {
    ${u.join("\n")}
  }
  `.trim();
}
function T(e, t) {
  var r = S(e, t);
  if ((0, x.Z)()) {
    (0, E.hq)(r, `${k}-dynamic-theme`);
  }
}
var C;
var A;
var _ = require("./89528.js");
var O = require("./77966.js");
var M = ["getTargetContainer", "getPopupContainer", "renderEmpty", "pageHeader", "input", "pagination", "form"];
var P = "ant";
var q = "anticon";
function N() {
  return C || P;
}
function R() {
  return A || q;
}
function I(e) {
  var t = e.prefixCls;
  var r = e.iconPrefixCls;
  var n = e.theme;
  if (t !== undefined) {
    C = t;
  }
  if (r !== undefined) {
    A = r;
  }
  if (n) {
    T(N(), n);
  }
}
function j() {
  return {
    getPrefixCls: function (e, t) {
      return t || (e ? `${N()}-${e}` : N());
    },
    getIconPrefixCls: R,
    getRootPrefixCls: function (e, t) {
      return e || C || (t && t.includes("-") ? t.replace(/^(.*)-[^-]*$/, "$1") : N());
    }
  };
}
function D(e) {
  var t = e.children;
  var r = e.csp;
  var l = e.autoInsertSpaceInButton;
  var c = e.form;
  var d = e.locale;
  var g = e.componentSize;
  var v = e.direction;
  var y = e.space;
  var b = e.virtual;
  var w = e.dropdownMatchSelectWidth;
  var x = e.legacyLocale;
  var E = e.parentContext;
  var k = e.iconPrefixCls;
  var S = e.componentDisabled;
  var T = a.useCallback(function (t, r) {
    var n = e.prefixCls;
    if (r) {
      return r;
    }
    var i = n || E.getPrefixCls("");
    if (t) {
      return `${i}-${t}`;
    } else {
      return i;
    }
  }, [E.getPrefixCls, e.prefixCls]);
  var C = (0, n.Z)((0, n.Z)({}, E), {
    csp: r,
    autoInsertSpaceInButton: l,
    locale: d || x,
    direction: v,
    space: y,
    virtual: b,
    dropdownMatchSelectWidth: w,
    getPrefixCls: T
  });
  M.forEach(function (t) {
    var r = e[t];
    if (r) {
      C[t] = r;
    }
  });
  var A = (0, o.Z)(function () {
    return C;
  }, C, function (e, t) {
    var r = Object.keys(e);
    var n = Object.keys(t);
    return r.length !== n.length || r.some(function (r) {
      return e[r] !== t[r];
    });
  });
  var P = a.useMemo(function () {
    return {
      prefixCls: k,
      csp: r
    };
  }, [k, r]);
  var q = t;
  var N = a.useMemo(function () {
    return (0, s.T)(m.Z.Form?.defaultValidateMessages || {}, A.locale?.Form?.defaultValidateMessages || {}, A.form?.validateMessages || {}, c?.validateMessages || {});
  }, [A, c?.validateMessages]);
  if (Object.keys(N).length > 0) {
    q = a.createElement(u.Z.Provider, {
      value: N
    }, t);
  }
  if (d) {
    q = a.createElement(f, {
      locale: d,
      _ANT_MARK__: p
    }, q);
  }
  if (k || r) {
    q = a.createElement(i.Z.Provider, {
      value: P
    }, q);
  }
  if (g) {
    q = a.createElement(O.q, {
      size: g
    }, q);
  }
  if (S !== undefined) {
    q = a.createElement(_.n, {
      disabled: S
    }, q);
  }
  return a.createElement(h.E_.Provider, {
    value: A
  }, q);
}
function L(e) {
  a.useEffect(function () {
    if (e.direction) {
      v.default.config({
        rtl: e.direction === "rtl"
      });
      y.default.config({
        rtl: e.direction === "rtl"
      });
    }
  }, [e.direction]);
  return a.createElement(g.Z, null, function (t, r, i) {
    return a.createElement(h.C, null, function (t) {
      return a.createElement(D, (0, n.Z)({
        parentContext: t,
        legacyLocale: i
      }, e));
    });
  });
}
L.ConfigContext = h.E_;
L.SizeContext = O.Z;
L.config = I;
var F = L;
};
