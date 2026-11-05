// webpack module 52735 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return B;
  }
});
var n = require("./8951.js");
var i = require("./45810.js");
var o = require("./12683.js");
var a = require("./69926.js");
var s = require("./53691.js");
var u = require("./78212.js");
var l = require("./34256.js");
var c = require("./20110.js");
var p = require("./38399.js");
var d = p;
var f = require("./63436.js");
var g = require("./56697.js");
var m = require("./91842.js");
var v = require("./59496.js");
var y = require("./52520.js");
var h = require("./94738.js");
var b = require("./2824.js");
var w = require("./40937.js");
var x = require("./75728.js");
var E = require("./21487.js");
function k(e, t) {
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
function S(e) {
  var t = e.prefixCls;
  var r = e.className;
  var n = e.dashed;
  var i = k(e, ["prefixCls", "className", "dashed"]);
  var o = v.useContext(y.E_);
  var a = o.getPrefixCls;
  var s = a("menu", t);
  var u = d((0, E.Z)({}, `${s}-item-divider-dashed`, !!n), r);
  return v.createElement(f.iz, (0, l.Z)({
    className: u
  }, i));
}
var T = S;
var C = require("./3787.js");
var A = require("./31585.js");
var _ = (0, v.createContext)({
  prefixCls: "",
  firstLevel: true,
  inlineCollapsed: false
});
var O = _;
function M(e, t, r) {
  t = (0, s.Z)(t);
  return (0, o.Z)(e, (0, a.Z)() ? Reflect.construct(t, r || [], (0, s.Z)(e).constructor) : t.apply(e, r));
}
function P(e, t) {
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
var q = function (e) {
  function t() {
    var e;
    (0, n.Z)(this, t);
    e = M(this, t, arguments);
    e.renderItem = function (t) {
      var n = t.siderCollapsed;
      var i = e.context;
      var o = i.prefixCls;
      var a = i.firstLevel;
      var s = i.inlineCollapsed;
      var u = i.direction;
      var c = i.disableMenuItemTitleTooltip;
      var p = e.props;
      var g = p.className;
      var m = p.children;
      var y = e.props;
      var h = y.title;
      var b = y.icon;
      var x = y.danger;
      var k = P(y, ["title", "icon", "danger"]);
      var S = h;
      if (typeof h === "undefined") {
        S = a ? m : "";
      } else if (h === false) {
        S = "";
      }
      var T = {
        title: S
      };
      if (!n && !s) {
        T.title = null;
        T.open = false;
      }
      var _ = (0, C.Z)(m).length;
      var O = v.createElement(f.ck, (0, l.Z)({}, k, {
        className: d((0, E.Z)((0, E.Z)({}, `${o}-item-danger`, x), `${o}-item-only-child`, (b ? _ + 1 : _) === 1), g),
        title: typeof h === "string" ? h : undefined
      }), (0, w.Tm)(b, {
        className: d((0, w.l$)(b) ? b.props?.className : "", `${o}-item-icon`)
      }), e.renderItemChildren(s));
      if (!c) {
        O = v.createElement(A.Z, (0, l.Z)({}, T, {
          placement: u === "rtl" ? "left" : "right",
          overlayClassName: `${o}-inline-collapsed-tooltip`
        }), O);
      }
      return O;
    };
    return e;
  }
  (0, u.Z)(t, e);
  (0, i.Z)(t, [{
    key: "renderItemChildren",
    value: function (e) {
      var t = this.context;
      var r = t.prefixCls;
      var n = t.firstLevel;
      var i = this.props;
      var o = i.icon;
      var a = i.children;
      var s = v.createElement("span", {
        className: `${r}-title-content`
      }, a);
      if ((!o || (0, w.l$)(a) && a.type === "span") && a && e && n && typeof a === "string") {
        return v.createElement("div", {
          className: `${r}-inline-collapsed-noicon`
        }, a.charAt(0));
      } else {
        return s;
      }
    }
  }, {
    key: "render",
    value: function () {
      return v.createElement(h.D.Consumer, null, this.renderItem);
    }
  }]);
  return t;
}(v.Component);
function N(e) {
  var r;
  var n = e.popupClassName;
  var i = e.icon;
  var o = e.title;
  var a = e.theme;
  var s = v.useContext(O);
  var u = s.prefixCls;
  var c = s.inlineCollapsed;
  var p = s.antdMenuTheme;
  var g = (0, f.Xl)();
  if (i) {
    var y = (0, w.l$)(o) && o.type === "span";
    r = v.createElement(v.Fragment, null, (0, w.Tm)(i, {
      className: d((0, w.l$)(i) ? i.props?.className : "", `${u}-item-icon`)
    }), y ? o : v.createElement("span", {
      className: `${u}-title-content`
    }, o));
  } else {
    r = c && !g.length && o && typeof o === "string" ? v.createElement("div", {
      className: `${u}-inline-collapsed-noicon`
    }, o.charAt(0)) : v.createElement("span", {
      className: `${u}-title-content`
    }, o);
  }
  var h = v.useMemo(function () {
    return (0, l.Z)((0, l.Z)({}, s), {
      firstLevel: false
    });
  }, [s]);
  return v.createElement(O.Provider, {
    value: h
  }, v.createElement(f.Wd, (0, l.Z)({}, (0, m.Z)(e, ["icon"]), {
    title: r,
    popupClassName: d(u, `${u}-${a || p}`, n)
  })));
}
q.contextType = O;
var R = N;
function I(e, t) {
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
function j(e) {
  return (e || []).map(function (e, t) {
    if (e && (0, x.Z)(e) === "object") {
      var r = e;
      var n = r.label;
      var i = r.children;
      var o = r.key;
      var a = r.type;
      var s = I(r, ["label", "children", "key", "type"]);
      var u = o ?? `tmp-${t}`;
      if (i || a === "group") {
        if (a === "group") {
          return v.createElement(f.BW, (0, l.Z)({
            key: u
          }, s, {
            title: n
          }), j(i));
        } else {
          return v.createElement(R, (0, l.Z)({
            key: u
          }, s, {
            title: n
          }), j(i));
        }
      } else if (a === "divider") {
        return v.createElement(T, (0, l.Z)({
          key: u
        }, s));
      } else {
        return v.createElement(q, (0, l.Z)({
          key: u
        }, s), n);
      }
    }
    return null;
  }).filter(function (e) {
    return e;
  });
}
function D(e) {
  return v.useMemo(function () {
    if (e) {
      return j(e);
    } else {
      return e;
    }
  }, [e]);
}
var L = require("./94269.js");
function F(e, t, r) {
  t = (0, s.Z)(t);
  return (0, o.Z)(e, (0, a.Z)() ? Reflect.construct(t, r || [], (0, s.Z)(e).constructor) : t.apply(e, r));
}
function Z(e, t) {
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
var z = (0, v.forwardRef)(function (e, t) {
  var r;
  var n = v.useContext(L.Z) || {};
  var i = v.useContext(y.E_);
  var o = i.getPrefixCls;
  var a = i.getPopupContainer;
  var s = i.direction;
  var u = o();
  var p = e.prefixCls;
  var h = e.className;
  var x = e.theme;
  var E = x === undefined ? "light" : x;
  var k = e.expandIcon;
  var S = e._internalDisableMenuItemTitleTooltip;
  var T = e.inlineCollapsed;
  var C = e.siderCollapsed;
  var A = e.items;
  var _ = e.children;
  var M = e.mode;
  var P = e.selectable;
  var q = e.onClick;
  var N = Z(e, ["prefixCls", "className", "theme", "expandIcon", "_internalDisableMenuItemTitleTooltip", "inlineCollapsed", "siderCollapsed", "items", "children", "mode", "selectable", "onClick"]);
  var R = (0, m.Z)(N, ["collapsedWidth"]);
  var I = D(A) || _;
  if ((r = n.validator) !== null && r !== undefined) {
    r.call(n, {
      mode: M
    });
  }
  var j;
  var F = (0, g.Z)(function () {
    var e;
    if (q !== null && q !== undefined) {
      q.apply(undefined, arguments);
    }
    if ((e = n?.onClick) !== null && e !== undefined) {
      e.call(n);
    }
  });
  var z = n.mode || M;
  var U = P ?? n.selectable;
  var B = v.useMemo(function () {
    if (C !== undefined) {
      return C;
    } else {
      return T;
    }
  }, [T, C]);
  var V = {
    horizontal: {
      motionName: `${u}-slide-up`
    },
    inline: b.ZP,
    other: {
      motionName: `${u}-zoom-big`
    }
  };
  var H = o("menu", p || n.prefixCls);
  var W = d(`${H}-${E}`, h);
  j = typeof k === "function" ? k : (0, w.Tm)(k || n.expandIcon, {
    className: `${H}-submenu-expand-icon`
  });
  var Y = v.useMemo(function () {
    return {
      prefixCls: H,
      inlineCollapsed: B || false,
      antdMenuTheme: E,
      direction: s,
      firstLevel: true,
      disableMenuItemTitleTooltip: S
    };
  }, [H, B, E, s, S]);
  return v.createElement(L.Z.Provider, {
    value: null
  }, v.createElement(O.Provider, {
    value: Y
  }, v.createElement(f.ZP, (0, l.Z)({
    getPopupContainer: a,
    overflowedIndicator: v.createElement(c.Z, null),
    overflowedIndicatorPopupClassName: `${H}-${E}`,
    mode: z,
    selectable: U,
    onClick: F
  }, R, {
    inlineCollapsed: B,
    className: W,
    prefixCls: H,
    direction: s,
    defaultMotions: V,
    expandIcon: j,
    ref: t
  }), I)));
});
var U = function (e) {
  function t() {
    var e;
    (0, n.Z)(this, t);
    e = F(this, t, arguments);
    e.focus = function (t) {
      var r;
      if ((r = e.menu) !== null && r !== undefined) {
        r.focus(t);
      }
    };
    return e;
  }
  (0, u.Z)(t, e);
  (0, i.Z)(t, [{
    key: "render",
    value: function () {
      var e = this;
      return v.createElement(h.D.Consumer, null, function (t) {
        return v.createElement(z, (0, l.Z)({
          ref: function (t) {
            e.menu = t;
          }
        }, e.props, t));
      });
    }
  }]);
  return t;
}(v.Component);
U.Divider = T;
U.Item = q;
U.SubMenu = R;
U.ItemGroup = f.BW;
var B = U;
};
