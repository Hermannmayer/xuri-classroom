// webpack module 63436 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  iz: function () {
    return rt;
  },
  ck: function () {
    return Se;
  },
  BW: function () {
    return tt;
  },
  sN: function () {
    return Se;
  },
  GP: function () {
    return tt;
  },
  Wd: function () {
    return Ye;
  },
  ZP: function () {
    return it;
  },
  Xl: function () {
    return O;
  }
});
var n = require("./34256.js");
var i = require("./21487.js");
var o = require("./91613.js");
var a = require("./66439.js");
var s = require("./23874.js");
var u = require("./37913.js");
var l = require("./38399.js");
var c = l;
var p = require("./36854.js");
var d = require("./47530.js");
var f = require("./68044.js");
var g = require("./59496.js");
var m = require("./87995.js");
var v = require("./44207.js");
var y = g.createContext(null);
function h(e, t) {
  if (e === undefined) {
    return null;
  } else {
    return `${e}-${t}`;
  }
}
function b(e) {
  var t = g.useContext(y);
  return h(t, e);
}
var w = require("./64057.js");
var x = ["children", "locked"];
var E = g.createContext(null);
function k(e, t) {
  var r = (0, o.Z)({}, e);
  Object.keys(t).forEach(function (e) {
    var n = t[e];
    if (n !== undefined) {
      r[e] = n;
    }
  });
  return r;
}
function S(e) {
  var t = e.children;
  var r = e.locked;
  var n = (0, u.Z)(e, x);
  var i = g.useContext(E);
  var o = (0, w.Z)(function () {
    return k(i, n);
  }, [i, n], function (e, t) {
    return !r && (e[0] !== t[0] || !(0, v.Z)(e[1], t[1], true));
  });
  return g.createElement(E.Provider, {
    value: o
  }, t);
}
var T = [];
var C = g.createContext(null);
function A() {
  return g.useContext(C);
}
var _ = g.createContext(T);
function O(e) {
  var t = g.useContext(_);
  return g.useMemo(function () {
    if (e !== undefined) {
      return [].concat((0, a.Z)(t), [e]);
    } else {
      return t;
    }
  }, [t, e]);
}
var M = g.createContext(null);
var P = g.createContext({});
var q = P;
var N = require("./27193.js");
var R = require("./45406.js");
var I = require("./62661.js");
var j = N.Z.LEFT;
var D = N.Z.RIGHT;
var L = N.Z.UP;
var F = N.Z.DOWN;
var Z = N.Z.ENTER;
var z = N.Z.ESC;
var U = N.Z.HOME;
var B = N.Z.END;
var V = [L, F, j, D];
function H(e, t, r, n) {
  var o;
  var a;
  var s;
  var l = "prev";
  var c = "next";
  var p = "children";
  var d = "parent";
  if (e === "inline" && n === Z) {
    return {
      inlineTrigger: true
    };
  }
  o = {};
  (0, i.Z)(o, L, l);
  (0, i.Z)(o, F, c);
  var f = o;
  a = {};
  (0, i.Z)(a, j, r ? c : l);
  (0, i.Z)(a, D, r ? l : c);
  (0, i.Z)(a, F, p);
  (0, i.Z)(a, Z, p);
  var g = a;
  s = {};
  (0, i.Z)(s, L, l);
  (0, i.Z)(s, F, c);
  (0, i.Z)(s, Z, p);
  (0, i.Z)(s, z, d);
  (0, i.Z)(s, j, r ? p : d);
  (0, i.Z)(s, D, r ? d : p);
  var m = s;
  var v = {
    inline: f,
    horizontal: g,
    vertical: m,
    inlineSub: f,
    horizontalSub: m,
    verticalSub: m
  };
  var y = v[`${e}${t ? "" : "Sub"}`]?.[n];
  switch (y) {
    case l:
      return {
        offset: -1,
        sibling: true
      };
    case c:
      return {
        offset: 1,
        sibling: true
      };
    case d:
      return {
        offset: -1,
        sibling: false
      };
    case p:
      return {
        offset: 1,
        sibling: false
      };
    default:
      return null;
  }
}
function W(e) {
  var t = e;
  while (t) {
    if (t.getAttribute("data-menu-list")) {
      return t;
    }
    t = t.parentElement;
  }
  return null;
}
function Y(e, t) {
  var r = e || document.activeElement;
  while (r) {
    if (t.has(r)) {
      return r;
    }
    r = r.parentElement;
  }
  return null;
}
function Q(e, t) {
  var r = (0, I.tS)(e, true);
  return r.filter(function (e) {
    return t.has(e);
  });
}
function $(e, t, r, n = 1) {
  if (!e) {
    return null;
  }
  var i = Q(e, t);
  var o = i.length;
  var a = i.findIndex(function (e) {
    return r === e;
  });
  if (n < 0) {
    if (a === -1) {
      a = o - 1;
    } else {
      a -= 1;
    }
  } else if (n > 0) {
    a += 1;
  }
  a = (a + o) % o;
  return i[a];
}
function G(e, t, r, n, i, o, a, s, u, l) {
  var c = g.useRef();
  var p = g.useRef();
  p.current = t;
  function d() {
    R.Z.cancel(c.current);
  }
  g.useEffect(function () {
    return function () {
      d();
    };
  }, []);
  return function (f) {
    var g = f.which;
    if ([].concat(V, [Z, z, U, B]).includes(g)) {
      var m;
      var v;
      var y;
      function b() {
        m = new Set();
        v = new Map();
        y = new Map();
        var e = o();
        e.forEach(function (e) {
          var t = document.querySelector(`[data-menu-id='${h(n, e)}']`);
          if (t) {
            m.add(t);
            y.set(t, e);
            v.set(e, t);
          }
        });
        return m;
      }
      b();
      var w = v.get(t);
      var x = Y(w, m);
      var E = y.get(x);
      var k = H(e, a(E, true).length === 1, r, g);
      if (!k && g !== U && g !== B) {
        return;
      }
      if (V.includes(g) || [U, B].includes(g)) {
        f.preventDefault();
      }
      function S(e) {
        if (e) {
          var t = e;
          var r = e.querySelector("a");
          if (r !== null && r !== undefined && r.getAttribute("href")) {
            t = r;
          }
          var n = y.get(e);
          s(n);
          d();
          c.current = (0, R.Z)(function () {
            if (p.current === n) {
              t.focus();
            }
          });
        }
      }
      if ([U, B].includes(g) || k.sibling || !x) {
        var T;
        var C;
        T = x && e !== "inline" ? W(x) : i.current;
        var A = Q(T, m);
        C = g === U ? A[0] : g === B ? A[A.length - 1] : $(T, m, x, k.offset);
        S(C);
      } else if (k.inlineTrigger) {
        u(E);
      } else if (k.offset > 0) {
        u(E, true);
        d();
        c.current = (0, R.Z)(function () {
          b();
          var e = x.getAttribute("aria-controls");
          var t = document.getElementById(e);
          var r = $(t, m);
          S(r);
        }, 5);
      } else if (k.offset < 0) {
        var _ = a(E, true);
        var O = _[_.length - 2];
        var M = v.get(O);
        u(O, false);
        S(M);
      }
    }
    if (l !== null && l !== undefined) {
      l(f);
    }
  };
}
function K(e) {
  Promise.resolve().then(e);
}
var J = "__RC_UTIL_PATH_SPLIT__";
function X(e) {
  return e.join(J);
}
function ee(e) {
  return e.split(J);
}
var te = "rc-menu-more";
function re() {
  var e = g.useState({});
  var t = (0, s.Z)(e, 2);
  var r = t[1];
  var n = (0, g.useRef)(new Map());
  var i = (0, g.useRef)(new Map());
  var o = g.useState([]);
  var u = (0, s.Z)(o, 2);
  var l = u[0];
  var c = u[1];
  var p = (0, g.useRef)(0);
  var d = (0, g.useRef)(false);
  function f() {
    if (!d.current) {
      r({});
    }
  }
  var m = (0, g.useCallback)(function (e, t) {
    var r = X(t);
    i.current.set(r, e);
    n.current.set(e, r);
    p.current += 1;
    var o = p.current;
    K(function () {
      if (o === p.current) {
        f();
      }
    });
  }, []);
  var v = (0, g.useCallback)(function (e, t) {
    var r = X(t);
    i.current.delete(r);
    n.current.delete(e);
  }, []);
  var y = (0, g.useCallback)(function (e) {
    c(e);
  }, []);
  var h = (0, g.useCallback)(function (e, t) {
    var r = n.current.get(e) || "";
    var i = ee(r);
    if (t && l.includes(i[0])) {
      i.unshift(te);
    }
    return i;
  }, [l]);
  var b = (0, g.useCallback)(function (e, t) {
    return e.some(function (e) {
      var r = h(e, true);
      return r.includes(t);
    });
  }, [h]);
  function w() {
    var e = (0, a.Z)(n.current.keys());
    if (l.length) {
      e.push(te);
    }
    return e;
  }
  var x = (0, g.useCallback)(function (e) {
    var t = `${n.current.get(e)}${J}`;
    var r = new Set();
    (0, a.Z)(i.current.keys()).forEach(function (e) {
      if (e.startsWith(t)) {
        r.add(i.current.get(e));
      }
    });
    return r;
  }, []);
  g.useEffect(function () {
    return function () {
      d.current = true;
    };
  }, []);
  return {
    registerPath: m,
    unregisterPath: v,
    refreshOverflowKeys: y,
    isSubPathKey: b,
    getKeyPath: h,
    getKeys: w,
    getSubPathKeys: x
  };
}
function ne(e) {
  var t = g.useRef(e);
  t.current = e;
  var r = g.useCallback(function () {
    var e;
    for (var r = arguments.length, n = new Array(r), i = 0; i < r; i++) {
      n[i] = arguments[i];
    }
    if ((e = t.current) === null || e === undefined) {
      return undefined;
    } else {
      return e.call.apply(e, [t].concat(n));
    }
  }, []);
  if (e) {
    return r;
  } else {
    return undefined;
  }
}
var ie = Math.random().toFixed(5).toString().slice(2);
var oe = 0;
function ae(e) {
  var t = (0, d.Z)(e, {
    value: e
  });
  var r = (0, s.Z)(t, 2);
  var n = r[0];
  var i = r[1];
  g.useEffect(function () {
    oe += 1;
    var e = `${ie}-${oe}`;
    i(`rc-menu-uuid-${e}`);
  }, []);
  return n;
}
var se = require("./8951.js");
var ue = require("./45810.js");
var le = require("./78212.js");
var ce = require("./19746.js");
var pe = require("./91842.js");
var de = require("./97969.js");
function fe(e, t, r, n) {
  var i = g.useContext(E);
  var o = i.activeKey;
  var a = i.onActive;
  var s = i.onInactive;
  var u = {
    active: o === e
  };
  if (!t) {
    u.onMouseEnter = function (t) {
      if (r !== null && r !== undefined) {
        r({
          key: e,
          domEvent: t
        });
      }
      a(e);
    };
    u.onMouseLeave = function (t) {
      if (n !== null && n !== undefined) {
        n({
          key: e,
          domEvent: t
        });
      }
      s(e);
    };
  }
  return u;
}
function ge(e) {
  var t = g.useContext(E);
  var r = t.mode;
  var n = t.rtl;
  var i = t.inlineIndent;
  if (r !== "inline") {
    return null;
  }
  var o = e;
  if (n) {
    return {
      paddingRight: o * i
    };
  } else {
    return {
      paddingLeft: o * i
    };
  }
}
function me(e) {
  var t;
  var r = e.icon;
  var n = e.props;
  var i = e.children;
  t = typeof r === "function" ? g.createElement(r, (0, o.Z)({}, n)) : r;
  return t || i || null;
}
var ve = ["item"];
function ye(e) {
  var t = e.item;
  var r = (0, u.Z)(e, ve);
  Object.defineProperty(r, "item", {
    get: function () {
      (0, f.ZP)(false, "`info.item` is deprecated since we will move to function component that not provides React Node instance in future.");
      return t;
    }
  });
  return r;
}
var he = ["title", "attribute", "elementRef"];
var be = ["style", "className", "eventKey", "warnKey", "disabled", "itemIcon", "children", "role", "onMouseEnter", "onMouseLeave", "onClick", "onKeyDown", "onFocus"];
var we = ["active"];
var xe = function (e) {
  (0, le.Z)(r, e);
  var t = (0, ce.Z)(r);
  function r() {
    (0, se.Z)(this, r);
    return t.apply(this, arguments);
  }
  (0, ue.Z)(r, [{
    key: "render",
    value: function () {
      var e = this.props;
      var t = e.title;
      var r = e.attribute;
      var i = e.elementRef;
      var o = (0, u.Z)(e, he);
      var a = (0, pe.Z)(o, ["eventKey", "popupClassName", "popupOffset", "onTitleClick"]);
      (0, f.ZP)(!r, "`attribute` of Menu.Item is deprecated. Please pass attribute directly.");
      return g.createElement(p.Z.Item, (0, n.Z)({}, r, {
        title: typeof t === "string" ? t : undefined
      }, a, {
        ref: i
      }));
    }
  }]);
  return r;
}(g.Component);
var Ee = g.forwardRef(function (e, t) {
  var r;
  var s = e.style;
  var l = e.className;
  var p = e.eventKey;
  e.warnKey;
  var d = e.disabled;
  var f = e.itemIcon;
  var m = e.children;
  var v = e.role;
  var y = e.onMouseEnter;
  var h = e.onMouseLeave;
  var w = e.onClick;
  var x = e.onKeyDown;
  var k = e.onFocus;
  var S = (0, u.Z)(e, be);
  var T = b(p);
  var C = g.useContext(E);
  var A = C.prefixCls;
  var _ = C.onItemClick;
  var M = C.disabled;
  var P = C.overflowDisabled;
  var R = C.itemIcon;
  var I = C.selectedKeys;
  var j = C.onActive;
  var D = g.useContext(q);
  var L = D._internalRenderMenuItem;
  var F = `${A}-item`;
  var Z = g.useRef();
  var z = g.useRef();
  var U = M || d;
  var B = (0, de.x1)(t, z);
  var V = O(p);
  function H(e) {
    return {
      key: p,
      keyPath: (0, a.Z)(V).reverse(),
      item: Z.current,
      domEvent: e
    };
  }
  var W = f || R;
  var Y = fe(p, U, y, h);
  var Q = Y.active;
  var $ = (0, u.Z)(Y, we);
  var G = I.includes(p);
  var K = ge(V.length);
  function J(e) {
    if (!U) {
      var t = H(e);
      if (w !== null && w !== undefined) {
        w(ye(t));
      }
      _(t);
    }
  }
  function X(e) {
    if (x !== null && x !== undefined) {
      x(e);
    }
    if (e.which === N.Z.ENTER) {
      var t = H(e);
      if (w !== null && w !== undefined) {
        w(ye(t));
      }
      _(t);
    }
  }
  function ee(e) {
    j(p);
    if (k !== null && k !== undefined) {
      k(e);
    }
  }
  var te = {};
  if (e.role === "option") {
    te["aria-selected"] = G;
  }
  var re = g.createElement(xe, (0, n.Z)({
    ref: Z,
    elementRef: B,
    role: v === null ? "none" : v || "menuitem",
    tabIndex: d ? null : -1,
    "data-menu-id": P && T ? null : T
  }, S, $, te, {
    component: "li",
    "aria-disabled": d,
    style: (0, o.Z)((0, o.Z)({}, K), s),
    className: c(F, (r = {}, (0, i.Z)(r, `${F}-active`, Q), (0, i.Z)(r, `${F}-selected`, G), (0, i.Z)(r, `${F}-disabled`, U), r), l),
    onClick: J,
    onKeyDown: X,
    onFocus: ee
  }), m, g.createElement(me, {
    props: (0, o.Z)((0, o.Z)({}, e), {}, {
      isSelected: G
    }),
    icon: W
  }));
  if (L) {
    re = L(re, e, {
      selected: G
    });
  }
  return re;
});
function ke(e, t) {
  var r = e.eventKey;
  var i = A();
  var o = O(r);
  g.useEffect(function () {
    if (i) {
      i.registerPath(r, o);
      return function () {
        i.unregisterPath(r, o);
      };
    }
  }, [o]);
  if (i) {
    return null;
  } else {
    return g.createElement(Ee, (0, n.Z)({}, e, {
      ref: t
    }));
  }
}
var Se = g.forwardRef(ke);
var Te = ["className", "children"];
function Ce(e, t) {
  var r = e.className;
  var i = e.children;
  var o = (0, u.Z)(e, Te);
  var a = g.useContext(E);
  var s = a.prefixCls;
  var l = a.mode;
  var p = a.rtl;
  return g.createElement("ul", (0, n.Z)({
    className: c(s, p && `${s}-rtl`, `${s}-sub`, `${s}-${l === "inline" ? "inline" : "vertical"}`, r),
    role: "menu"
  }, o, {
    "data-menu-list": true,
    ref: t
  }), i);
}
var Ae = g.forwardRef(Ce);
Ae.displayName = "SubMenuList";
var _e = Ae;
var Oe = require("./75728.js");
var Me = require("./3787.js");
var Pe = ["label", "children", "key", "type"];
function qe(e, t) {
  return (0, Me.Z)(e).map(function (e, r) {
    if (g.isValidElement(e)) {
      var o = e.key;
      var s = e.props?.eventKey ?? o;
      var u = s === null || s === undefined;
      if (u) {
        s = `tmp_key-${[].concat((0, a.Z)(t), [r]).join("-")}`;
      }
      var l = {
        key: s,
        eventKey: s
      };
      return g.cloneElement(e, l);
    }
    return e;
  });
}
function Ne(e) {
  return (e || []).map(function (e, t) {
    if (e && (0, Oe.Z)(e) === "object") {
      var r = e;
      var i = r.label;
      var o = r.children;
      var a = r.key;
      var s = r.type;
      var l = (0, u.Z)(r, Pe);
      var c = a ?? `tmp-${t}`;
      if (o || s === "group") {
        if (s === "group") {
          return g.createElement(tt, (0, n.Z)({
            key: c
          }, l, {
            title: i
          }), Ne(o));
        } else {
          return g.createElement(Ye, (0, n.Z)({
            key: c
          }, l, {
            title: i
          }), Ne(o));
        }
      } else if (s === "divider") {
        return g.createElement(rt, (0, n.Z)({
          key: c
        }, l));
      } else {
        return g.createElement(Se, (0, n.Z)({
          key: c
        }, l), i);
      }
    }
    return null;
  }).filter(function (e) {
    return e;
  });
}
function Re(e, t, r) {
  var n = e;
  if (t) {
    n = Ne(t);
  }
  return qe(n, r);
}
var Ie = require("./8019.js");
var je = {
  adjustX: 1,
  adjustY: 1
};
var De = {
  topLeft: {
    points: ["bl", "tl"],
    overflow: je,
    offset: [0, -7]
  },
  bottomLeft: {
    points: ["tl", "bl"],
    overflow: je,
    offset: [0, 7]
  },
  leftTop: {
    points: ["tr", "tl"],
    overflow: je,
    offset: [-4, 0]
  },
  rightTop: {
    points: ["tl", "tr"],
    overflow: je,
    offset: [4, 0]
  }
};
var Le = {
  topLeft: {
    points: ["bl", "tl"],
    overflow: je,
    offset: [0, -7]
  },
  bottomLeft: {
    points: ["tl", "bl"],
    overflow: je,
    offset: [0, 7]
  },
  rightTop: {
    points: ["tr", "tl"],
    overflow: je,
    offset: [-4, 0]
  },
  leftTop: {
    points: ["tl", "tr"],
    overflow: je,
    offset: [4, 0]
  }
};
function Fe(e, t, r) {
  return t || (r ? r[e] || r.other : undefined);
}
var Ze = {
  horizontal: "bottomLeft",
  vertical: "rightTop",
  "vertical-left": "rightTop",
  "vertical-right": "leftTop"
};
function ze(e) {
  var t = e.prefixCls;
  var r = e.visible;
  var n = e.children;
  var a = e.popup;
  var u = e.popupClassName;
  var l = e.popupOffset;
  var p = e.disabled;
  var d = e.mode;
  var f = e.onVisibleChange;
  var m = g.useContext(E);
  var v = m.getPopupContainer;
  var y = m.rtl;
  var h = m.subMenuOpenDelay;
  var b = m.subMenuCloseDelay;
  var w = m.builtinPlacements;
  var x = m.triggerSubMenuAction;
  var k = m.forceSubMenuRender;
  var S = m.rootClassName;
  var T = m.motion;
  var C = m.defaultMotions;
  var A = g.useState(false);
  var _ = (0, s.Z)(A, 2);
  var O = _[0];
  var M = _[1];
  var P = y ? (0, o.Z)((0, o.Z)({}, Le), w) : (0, o.Z)((0, o.Z)({}, De), w);
  var q = Ze[d];
  var N = Fe(d, T, C);
  var I = g.useRef(N);
  if (d !== "inline") {
    I.current = N;
  }
  var j = (0, o.Z)((0, o.Z)({}, I.current), {}, {
    leavedClassName: `${t}-hidden`,
    removeOnLeave: false,
    motionAppear: true
  });
  var D = g.useRef();
  g.useEffect(function () {
    D.current = (0, R.Z)(function () {
      M(r);
    });
    return function () {
      R.Z.cancel(D.current);
    };
  }, [r]);
  return g.createElement(Ie.Z, {
    prefixCls: t,
    popupClassName: c(`${t}-popup`, (0, i.Z)({}, `${t}-rtl`, y), u, S),
    stretch: d === "horizontal" ? "minWidth" : null,
    getPopupContainer: v,
    builtinPlacements: P,
    popupPlacement: q,
    popupVisible: O,
    popup: a,
    popupAlign: l && {
      offset: l
    },
    action: p ? [] : [x],
    mouseEnterDelay: h,
    mouseLeaveDelay: b,
    onPopupVisibleChange: f,
    forceRender: k,
    popupMotion: j
  }, n);
}
var Ue = require("./96598.js");
function Be(e) {
  var t = e.id;
  var r = e.open;
  var i = e.keyPath;
  var a = e.children;
  var u = "inline";
  var l = g.useContext(E);
  var c = l.prefixCls;
  var p = l.forceSubMenuRender;
  var d = l.motion;
  var f = l.defaultMotions;
  var m = l.mode;
  var v = g.useRef(false);
  v.current = m === u;
  var y = g.useState(!v.current);
  var h = (0, s.Z)(y, 2);
  var b = h[0];
  var w = h[1];
  var x = !!v.current && r;
  g.useEffect(function () {
    if (v.current) {
      w(false);
    }
  }, [m]);
  var k = (0, o.Z)({}, Fe(u, d, f));
  if (i.length > 1) {
    k.motionAppear = false;
  }
  var T = k.onVisibleChanged;
  k.onVisibleChanged = function (e) {
    if (!v.current && !e) {
      w(true);
    }
    if (T === null || T === undefined) {
      return undefined;
    } else {
      return T(e);
    }
  };
  if (b) {
    return null;
  } else {
    return g.createElement(S, {
      mode: u,
      locked: !v.current
    }, g.createElement(Ue.default, (0, n.Z)({
      visible: x
    }, k, {
      forceRender: p,
      removeOnLeave: false,
      leavedClassName: `${c}-hidden`
    }), function (e) {
      var r = e.className;
      var n = e.style;
      return g.createElement(_e, {
        id: t,
        className: r,
        style: n
      }, a);
    }));
  }
}
var Ve = ["style", "className", "title", "eventKey", "warnKey", "disabled", "internalPopupClose", "children", "itemIcon", "expandIcon", "popupClassName", "popupOffset", "onClick", "onMouseEnter", "onMouseLeave", "onTitleClick", "onTitleMouseEnter", "onTitleMouseLeave"];
var He = ["active"];
function We(e) {
  var t;
  var r = e.style;
  var a = e.className;
  var l = e.title;
  var d = e.eventKey;
  e.warnKey;
  var f = e.disabled;
  var m = e.internalPopupClose;
  var v = e.children;
  var y = e.itemIcon;
  var h = e.expandIcon;
  var w = e.popupClassName;
  var x = e.popupOffset;
  var k = e.onClick;
  var T = e.onMouseEnter;
  var C = e.onMouseLeave;
  var A = e.onTitleClick;
  var _ = e.onTitleMouseEnter;
  var P = e.onTitleMouseLeave;
  var N = (0, u.Z)(e, Ve);
  var R = b(d);
  var I = g.useContext(E);
  var j = I.prefixCls;
  var D = I.mode;
  var L = I.openKeys;
  var F = I.disabled;
  var Z = I.overflowDisabled;
  var z = I.activeKey;
  var U = I.selectedKeys;
  var B = I.itemIcon;
  var V = I.expandIcon;
  var H = I.onItemClick;
  var W = I.onOpenChange;
  var Y = I.onActive;
  var Q = g.useContext(q);
  var $ = Q._internalRenderSubMenuItem;
  var G = g.useContext(M);
  var K = G.isSubPathKey;
  var J = O();
  var X = `${j}-submenu`;
  var ee = F || f;
  var te = g.useRef();
  var re = g.useRef();
  var ie = y || B;
  var oe = h || V;
  var ae = L.includes(d);
  var se = !Z && ae;
  var ue = K(U, d);
  var le = fe(d, ee, _, P);
  var ce = le.active;
  var pe = (0, u.Z)(le, He);
  var de = g.useState(false);
  var ve = (0, s.Z)(de, 2);
  var he = ve[0];
  var be = ve[1];
  function we(e) {
    if (!ee) {
      be(e);
    }
  }
  function xe(e) {
    we(true);
    if (T !== null && T !== undefined) {
      T({
        key: d,
        domEvent: e
      });
    }
  }
  function Ee(e) {
    we(false);
    if (C !== null && C !== undefined) {
      C({
        key: d,
        domEvent: e
      });
    }
  }
  var ke = g.useMemo(function () {
    return ce || D !== "inline" && (he || K([z], d));
  }, [D, ce, z, he, d, K]);
  var Se = ge(J.length);
  function Te(e) {
    if (!ee) {
      if (A !== null && A !== undefined) {
        A({
          key: d,
          domEvent: e
        });
      }
      if (D === "inline") {
        W(d, !ae);
      }
    }
  }
  var Ce = ne(function (e) {
    if (k !== null && k !== undefined) {
      k(ye(e));
    }
    H(e);
  });
  function Ae(e) {
    if (D !== "inline") {
      W(d, e);
    }
  }
  function Oe() {
    Y(d);
  }
  var Me = R && `${R}-popup`;
  var Pe = g.createElement("div", (0, n.Z)({
    role: "menuitem",
    style: Se,
    className: `${X}-title`,
    tabIndex: ee ? null : -1,
    ref: te,
    title: typeof l === "string" ? l : null,
    "data-menu-id": Z && R ? null : R,
    "aria-expanded": se,
    "aria-haspopup": true,
    "aria-controls": Me,
    "aria-disabled": ee,
    onClick: Te,
    onFocus: Oe
  }, pe), l, g.createElement(me, {
    icon: D !== "horizontal" ? oe : null,
    props: (0, o.Z)((0, o.Z)({}, e), {}, {
      isOpen: se,
      isSubMenu: true
    })
  }, g.createElement("i", {
    className: `${X}-arrow`
  })));
  var qe = g.useRef(D);
  if (D !== "inline" && J.length > 1) {
    qe.current = "vertical";
  } else {
    qe.current = D;
  }
  if (!Z) {
    var Ne = qe.current;
    Pe = g.createElement(ze, {
      mode: Ne,
      prefixCls: X,
      visible: !m && se && D !== "inline",
      popupClassName: w,
      popupOffset: x,
      popup: g.createElement(S, {
        mode: Ne === "horizontal" ? "vertical" : Ne
      }, g.createElement(_e, {
        id: Me,
        ref: re
      }, v)),
      disabled: ee,
      onVisibleChange: Ae
    }, Pe);
  }
  var Re = g.createElement(p.Z.Item, (0, n.Z)({
    role: "none"
  }, N, {
    component: "li",
    style: r,
    className: c(X, `${X}-${D}`, a, (t = {}, (0, i.Z)(t, `${X}-open`, se), (0, i.Z)(t, `${X}-active`, ke), (0, i.Z)(t, `${X}-selected`, ue), (0, i.Z)(t, `${X}-disabled`, ee), t)),
    onMouseEnter: xe,
    onMouseLeave: Ee
  }), Pe, !Z && g.createElement(Be, {
    id: Me,
    open: se,
    keyPath: J
  }, v));
  if ($) {
    Re = $(Re, e, {
      selected: ue,
      active: ke,
      open: se,
      disabled: ee
    });
  }
  return g.createElement(S, {
    onItemClick: Ce,
    mode: D === "horizontal" ? "vertical" : D,
    itemIcon: ie,
    expandIcon: oe
  }, Re);
}
function Ye(e) {
  var t;
  var r = e.eventKey;
  var n = e.children;
  var i = O(r);
  var o = qe(n, i);
  var a = A();
  g.useEffect(function () {
    if (a) {
      a.registerPath(r, i);
      return function () {
        a.unregisterPath(r, i);
      };
    }
  }, [i]);
  t = a ? o : g.createElement(We, e, o);
  return g.createElement(_.Provider, {
    value: i
  }, t);
}
var Qe = ["prefixCls", "rootClassName", "style", "className", "tabIndex", "items", "children", "direction", "id", "mode", "inlineCollapsed", "disabled", "disabledOverflow", "subMenuOpenDelay", "subMenuCloseDelay", "forceSubMenuRender", "defaultOpenKeys", "openKeys", "activeKey", "defaultActiveFirst", "selectable", "multiple", "defaultSelectedKeys", "selectedKeys", "onSelect", "onDeselect", "inlineIndent", "motion", "defaultMotions", "triggerSubMenuAction", "builtinPlacements", "itemIcon", "expandIcon", "overflowedIndicator", "overflowedIndicatorPopupClassName", "getPopupContainer", "onClick", "onOpenChange", "onKeyDown", "openAnimation", "openTransitionName", "_internalRenderMenuItem", "_internalRenderSubMenuItem"];
var $e = [];
var Ge = g.forwardRef(function (e, t) {
  var l;
  var f = e;
  var b = f.prefixCls;
  var w = b === undefined ? "rc-menu" : b;
  var x = f.rootClassName;
  var E = f.style;
  var k = f.className;
  var T = f.tabIndex;
  var A = T === undefined ? 0 : T;
  var _ = f.items;
  var O = f.children;
  var P = f.direction;
  var N = f.id;
  var R = f.mode;
  var I = R === undefined ? "vertical" : R;
  var j = f.inlineCollapsed;
  var D = f.disabled;
  var L = f.disabledOverflow;
  var F = f.subMenuOpenDelay;
  var Z = F === undefined ? 0.1 : F;
  var z = f.subMenuCloseDelay;
  var U = z === undefined ? 0.1 : z;
  var B = f.forceSubMenuRender;
  var V = f.defaultOpenKeys;
  var H = f.openKeys;
  var W = f.activeKey;
  var Y = f.defaultActiveFirst;
  var Q = f.selectable;
  var $ = Q === undefined || Q;
  var K = f.multiple;
  var J = K !== undefined && K;
  var X = f.defaultSelectedKeys;
  var ee = f.selectedKeys;
  var ie = f.onSelect;
  var oe = f.onDeselect;
  var se = f.inlineIndent;
  var ue = se === undefined ? 24 : se;
  var le = f.motion;
  var ce = f.defaultMotions;
  var pe = f.triggerSubMenuAction;
  var de = pe === undefined ? "hover" : pe;
  var fe = f.builtinPlacements;
  var ge = f.itemIcon;
  var me = f.expandIcon;
  var ve = f.overflowedIndicator;
  var he = ve === undefined ? "..." : ve;
  var be = f.overflowedIndicatorPopupClassName;
  var we = f.getPopupContainer;
  var xe = f.onClick;
  var Ee = f.onOpenChange;
  var ke = f.onKeyDown;
  f.openAnimation;
  f.openTransitionName;
  var Te = f._internalRenderMenuItem;
  var Ce = f._internalRenderSubMenuItem;
  var Ae = (0, u.Z)(f, Qe);
  var _e = g.useMemo(function () {
    return Re(O, _, $e);
  }, [O, _]);
  var Oe = g.useState(false);
  var Me = (0, s.Z)(Oe, 2);
  var Pe = Me[0];
  var qe = Me[1];
  var Ne = g.useRef();
  var Ie = ae(N);
  var je = P === "rtl";
  var De = (0, d.Z)(V, {
    value: H,
    postState: function (e) {
      return e || $e;
    }
  });
  var Le = (0, s.Z)(De, 2);
  var Fe = Le[0];
  var Ze = Le[1];
  function ze(e, t = false) {
    function r() {
      Ze(e);
      if (Ee !== null && Ee !== undefined) {
        Ee(e);
      }
    }
    if (t) {
      (0, m.flushSync)(r);
    } else {
      r();
    }
  }
  var Ue = g.useState(Fe);
  var Be = (0, s.Z)(Ue, 2);
  var Ve = Be[0];
  var He = Be[1];
  var We = g.useRef(false);
  var Ge = g.useMemo(function () {
    if (I !== "inline" && I !== "vertical" || !j) {
      return [I, false];
    } else {
      return ["vertical", j];
    }
  }, [I, j]);
  var Ke = (0, s.Z)(Ge, 2);
  var Je = Ke[0];
  var Xe = Ke[1];
  var et = Je === "inline";
  var tt = g.useState(Je);
  var rt = (0, s.Z)(tt, 2);
  var nt = rt[0];
  var it = rt[1];
  var ot = g.useState(Xe);
  var at = (0, s.Z)(ot, 2);
  var st = at[0];
  var ut = at[1];
  g.useEffect(function () {
    it(Je);
    ut(Xe);
    if (We.current) {
      if (et) {
        Ze(Ve);
      } else {
        ze($e);
      }
    }
  }, [Je, Xe]);
  var lt = g.useState(0);
  var ct = (0, s.Z)(lt, 2);
  var pt = ct[0];
  var dt = ct[1];
  var ft = pt >= _e.length - 1 || nt !== "horizontal" || L;
  g.useEffect(function () {
    if (et) {
      He(Fe);
    }
  }, [Fe]);
  g.useEffect(function () {
    We.current = true;
    return function () {
      We.current = false;
    };
  }, []);
  var gt = re();
  var mt = gt.registerPath;
  var vt = gt.unregisterPath;
  var yt = gt.refreshOverflowKeys;
  var ht = gt.isSubPathKey;
  var bt = gt.getKeyPath;
  var wt = gt.getKeys;
  var xt = gt.getSubPathKeys;
  var Et = g.useMemo(function () {
    return {
      registerPath: mt,
      unregisterPath: vt
    };
  }, [mt, vt]);
  var kt = g.useMemo(function () {
    return {
      isSubPathKey: ht
    };
  }, [ht]);
  g.useEffect(function () {
    yt(ft ? $e : _e.slice(pt + 1).map(function (e) {
      return e.key;
    }));
  }, [pt, ft]);
  var St = (0, d.Z)(W || Y && _e[0]?.key, {
    value: W
  });
  var Tt = (0, s.Z)(St, 2);
  var Ct = Tt[0];
  var At = Tt[1];
  var _t = ne(function (e) {
    At(e);
  });
  var Ot = ne(function () {
    At(undefined);
  });
  (0, g.useImperativeHandle)(t, function () {
    return {
      list: Ne.current,
      focus: function (e) {
        var r;
        var n;
        var i;
        var o = Ct ?? _e.find(function (e) {
          return !e.props.disabled;
        })?.key;
        if (o) {
          if ((r = Ne.current) !== null && r !== undefined && (n = r.querySelector(`li[data-menu-id='${h(Ie, o)}']`)) !== null && n !== undefined && (i = n.focus) !== null && i !== undefined) {
            i.call(n, e);
          }
        }
      }
    };
  });
  var Mt = (0, d.Z)(X || [], {
    value: ee,
    postState: function (e) {
      if (Array.isArray(e)) {
        return e;
      } else if (e === null || e === undefined) {
        return $e;
      } else {
        return [e];
      }
    }
  });
  var Pt = (0, s.Z)(Mt, 2);
  var qt = Pt[0];
  var Nt = Pt[1];
  function Rt(e) {
    if ($) {
      var t;
      var r = e.key;
      var n = qt.includes(r);
      t = J ? n ? qt.filter(function (e) {
        return e !== r;
      }) : [].concat((0, a.Z)(qt), [r]) : [r];
      Nt(t);
      var i = (0, o.Z)((0, o.Z)({}, e), {}, {
        selectedKeys: t
      });
      if (n) {
        if (oe !== null && oe !== undefined) {
          oe(i);
        }
      } else if (ie !== null && ie !== undefined) {
        ie(i);
      }
    }
    if (!J && Fe.length && nt !== "inline") {
      ze($e);
    }
  }
  var It = ne(function (e) {
    if (xe !== null && xe !== undefined) {
      xe(ye(e));
    }
    Rt(e);
  });
  var jt = ne(function (e, t) {
    var r = Fe.filter(function (t) {
      return t !== e;
    });
    if (t) {
      r.push(e);
    } else if (nt !== "inline") {
      var n = xt(e);
      r = r.filter(function (e) {
        return !n.has(e);
      });
    }
    if (!(0, v.Z)(Fe, r, true)) {
      ze(r, true);
    }
  });
  var Dt = ne(we);
  function Lt(e, t) {
    var r = t ?? !Fe.includes(e);
    jt(e, r);
  }
  var Ft = G(nt, Ct, je, Ie, Ne, wt, bt, At, Lt, ke);
  g.useEffect(function () {
    qe(true);
  }, []);
  var Zt = g.useMemo(function () {
    return {
      _internalRenderMenuItem: Te,
      _internalRenderSubMenuItem: Ce
    };
  }, [Te, Ce]);
  var zt = nt !== "horizontal" || L ? _e : _e.map(function (e, t) {
    return g.createElement(S, {
      key: e.key,
      overflowDisabled: t > pt
    }, e);
  });
  var Ut = g.createElement(p.Z, (0, n.Z)({
    id: N,
    ref: Ne,
    prefixCls: `${w}-overflow`,
    component: "ul",
    itemComponent: Se,
    className: c(w, `${w}-root`, `${w}-${nt}`, k, (l = {}, (0, i.Z)(l, `${w}-inline-collapsed`, st), (0, i.Z)(l, `${w}-rtl`, je), l), x),
    dir: P,
    style: E,
    role: "menu",
    tabIndex: A,
    data: zt,
    renderRawItem: function (e) {
      return e;
    },
    renderRawRest: function (e) {
      var t = e.length;
      var r = t ? _e.slice(-t) : null;
      return g.createElement(Ye, {
        eventKey: te,
        title: he,
        disabled: ft,
        internalPopupClose: t === 0,
        popupClassName: be
      }, r);
    },
    maxCount: nt !== "horizontal" || L ? p.Z.INVALIDATE : p.Z.RESPONSIVE,
    ssr: "full",
    "data-menu-list": true,
    onVisibleChange: function (e) {
      dt(e);
    },
    onKeyDown: Ft
  }, Ae));
  return g.createElement(q.Provider, {
    value: Zt
  }, g.createElement(y.Provider, {
    value: Ie
  }, g.createElement(S, {
    prefixCls: w,
    rootClassName: x,
    mode: nt,
    openKeys: Fe,
    rtl: je,
    disabled: D,
    motion: Pe ? le : null,
    defaultMotions: Pe ? ce : null,
    activeKey: Ct,
    onActive: _t,
    onInactive: Ot,
    selectedKeys: qt,
    inlineIndent: ue,
    subMenuOpenDelay: Z,
    subMenuCloseDelay: U,
    forceSubMenuRender: B,
    builtinPlacements: fe,
    triggerSubMenuAction: de,
    getPopupContainer: Dt,
    itemIcon: ge,
    expandIcon: me,
    onItemClick: It,
    onOpenChange: jt
  }, g.createElement(M.Provider, {
    value: kt
  }, Ut), g.createElement("div", {
    style: {
      display: "none"
    },
    "aria-hidden": true
  }, g.createElement(C.Provider, {
    value: Et
  }, _e)))));
});
var Ke = Ge;
var Je = ["className", "title", "eventKey", "children"];
var Xe = ["children"];
function et(e) {
  var t = e.className;
  var r = e.title;
  e.eventKey;
  var i = e.children;
  var o = (0, u.Z)(e, Je);
  var a = g.useContext(E);
  var s = a.prefixCls;
  var l = `${s}-item-group`;
  return g.createElement("li", (0, n.Z)({
    role: "presentation"
  }, o, {
    onClick: function (e) {
      return e.stopPropagation();
    },
    className: c(l, t)
  }), g.createElement("div", {
    role: "presentation",
    className: `${l}-title`,
    title: typeof r === "string" ? r : undefined
  }, r), g.createElement("ul", {
    role: "group",
    className: `${l}-list`
  }, i));
}
function tt(e) {
  var t = e.children;
  var r = (0, u.Z)(e, Xe);
  var n = O(r.eventKey);
  var i = qe(t, n);
  var o = A();
  if (o) {
    return i;
  } else {
    return g.createElement(et, (0, pe.Z)(r, ["warnKey"]), i);
  }
}
function rt(e) {
  var t = e.className;
  var r = e.style;
  var n = g.useContext(E);
  var i = n.prefixCls;
  var o = A();
  if (o) {
    return null;
  } else {
    return g.createElement("li", {
      className: c(`${i}-item-divider`, t),
      style: r
    });
  }
}
var nt = Ke;
nt.Item = Se;
nt.SubMenu = Ye;
nt.ItemGroup = tt;
nt.Divider = rt;
var it = nt;
};
