// webpack module 96583 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "ConfigConsumer", {
  enumerable: true,
  get: function () {
    return h.ConfigConsumer;
  }
});
Object.defineProperty(exports, "ConfigContext", {
  enumerable: true,
  get: function () {
    return h.ConfigContext;
  }
});
exports.globalConfig = exports.defaultPrefixCls = exports.defaultIconPrefixCls = exports.default = exports.configConsumerProps = undefined;
var o;
var a;
var s = i(require("./90585.js"));
var u = i(require("./2890.js"));
var l = i(require("./35622.js"));
var c = n(require("./59496.js"));
var p = require("./70873.js");
var d = i(require("./5681.js"));
var f = n(require("./90793.js"));
var g = i(require("./61727.js"));
var m = i(require("./79557.js"));
var v = i(require("./17190.js"));
var y = i(require("./98156.js"));
var h = require("./56619.js");
var b = require("./88139.js");
var w = require("./73965.js");
var x = n(require("./45636.js"));
exports.configConsumerProps = ["getTargetContainer", "getPopupContainer", "rootPrefixCls", "getPrefixCls", "renderEmpty", "csp", "autoInsertSpaceInButton", "locale", "pageHeader"];
var E = ["getTargetContainer", "getPopupContainer", "renderEmpty", "pageHeader", "input", "pagination", "form"];
var k = exports.defaultPrefixCls = "ant";
var S = exports.defaultIconPrefixCls = "anticon";
function T() {
  return o || k;
}
function C() {
  return a || S;
}
function A(e) {
  var t = e.prefixCls;
  var r = e.iconPrefixCls;
  var n = e.theme;
  if (t !== undefined) {
    o = t;
  }
  if (r !== undefined) {
    a = r;
  }
  if (n) {
    (0, b.registerTheme)(T(), n);
  }
}
exports.globalConfig = function () {
  return {
    getPrefixCls: function (e, t) {
      return t || (e ? `${T()}-${e}` : T());
    },
    getIconPrefixCls: C,
    getRootPrefixCls: function (e, t) {
      return e || o || (t && t.includes("-") ? t.replace(/^(.*)-[^-]*$/, "$1") : T());
    }
  };
};
function _(e) {
  var t = e.children;
  var r = e.csp;
  var n = e.autoInsertSpaceInButton;
  var i = e.form;
  var o = e.locale;
  var a = e.componentSize;
  var g = e.direction;
  var v = e.space;
  var y = e.virtual;
  var b = e.dropdownMatchSelectWidth;
  var k = e.legacyLocale;
  var S = e.parentContext;
  var T = e.iconPrefixCls;
  var C = e.componentDisabled;
  var A = c.useCallback(function (t, r) {
    var n = e.prefixCls;
    if (r) {
      return r;
    }
    var i = n || S.getPrefixCls("");
    if (t) {
      return `${i}-${t}`;
    } else {
      return i;
    }
  }, [S.getPrefixCls, e.prefixCls]);
  var _ = (0, s.default)((0, s.default)({}, S), {
    csp: r,
    autoInsertSpaceInButton: n,
    locale: o || k,
    direction: g,
    space: v,
    virtual: y,
    dropdownMatchSelectWidth: b,
    getPrefixCls: A
  });
  E.forEach(function (t) {
    var r = e[t];
    if (r) {
      _[t] = r;
    }
  });
  var O = (0, l.default)(function () {
    return _;
  }, _, function (e, t) {
    var r = Object.keys(e);
    var n = Object.keys(t);
    return r.length !== n.length || r.some(function (r) {
      return e[r] !== t[r];
    });
  });
  var M = c.useMemo(function () {
    return {
      prefixCls: T,
      csp: r
    };
  }, [T, r]);
  var P = t;
  var q = c.useMemo(function () {
    return (0, p.merge)(m.default.Form?.defaultValidateMessages || {}, O.locale?.Form?.defaultValidateMessages || {}, O.form?.validateMessages || {}, i?.validateMessages || {});
  }, [O, i?.validateMessages]);
  if (Object.keys(q).length > 0) {
    P = c.createElement(d.default.Provider, {
      value: q
    }, t);
  }
  if (o) {
    P = c.createElement(f.default, {
      locale: o,
      _ANT_MARK__: f.ANT_MARK
    }, P);
  }
  if (T || r) {
    P = c.createElement(u.default.Provider, {
      value: M
    }, P);
  }
  if (a) {
    P = c.createElement(x.SizeContextProvider, {
      size: a
    }, P);
  }
  if (C !== undefined) {
    P = c.createElement(w.DisabledContextProvider, {
      disabled: C
    }, P);
  }
  return c.createElement(h.ConfigContext.Provider, {
    value: O
  }, P);
}
function O(e) {
  c.useEffect(function () {
    if (e.direction) {
      v.default.config({
        rtl: e.direction === "rtl"
      });
      y.default.config({
        rtl: e.direction === "rtl"
      });
    }
  }, [e.direction]);
  return c.createElement(g.default, null, function (t, r, n) {
    return c.createElement(h.ConfigConsumer, null, function (t) {
      return c.createElement(_, (0, s.default)({
        parentContext: t,
        legacyLocale: n
      }, e));
    });
  });
}
O.ConfigContext = h.ConfigContext;
O.SizeContext = x.default;
O.config = A;
exports.default = O;
};
