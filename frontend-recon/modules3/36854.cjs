// webpack module 36854 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return D;
  }
});
var n = require("./34256.js");
var i = require("./91613.js");
var o = require("./23874.js");
var a = require("./37913.js");
var s = require("./59496.js");
var u = require("./38399.js");
var l = u;
var c = require("./60617.js");
var p = require("./88174.js");
var d = ["prefixCls", "invalidate", "item", "renderItem", "responsive", "responsiveDisabled", "registerSize", "itemKey", "className", "style", "children", "display", "order", "component"];
var f = undefined;
function g(e, t) {
  var r = e.prefixCls;
  var o = e.invalidate;
  var u = e.item;
  var p = e.renderItem;
  var g = e.responsive;
  var m = e.responsiveDisabled;
  var v = e.registerSize;
  var y = e.itemKey;
  var h = e.className;
  var b = e.style;
  var w = e.children;
  var x = e.display;
  var E = e.order;
  var k = e.component;
  var S = k === undefined ? "div" : k;
  var T = (0, a.Z)(e, d);
  var C = g && !x;
  function A(e) {
    v(y, e);
  }
  s.useEffect(function () {
    return function () {
      A(null);
    };
  }, []);
  var _;
  var O = p && u !== f ? p(u) : w;
  if (!o) {
    _ = {
      opacity: C ? 0 : 1,
      height: C ? 0 : f,
      overflowY: C ? "hidden" : f,
      order: g ? E : f,
      pointerEvents: C ? "none" : f,
      position: C ? "absolute" : f
    };
  }
  var M = {};
  if (C) {
    M["aria-hidden"] = true;
  }
  var P = s.createElement(S, (0, n.Z)({
    className: l(!o && r, h),
    style: (0, i.Z)((0, i.Z)({}, _), b)
  }, M, T, {
    ref: t
  }), O);
  if (g) {
    P = s.createElement(c.Z, {
      onResize: function (e) {
        var t = e.offsetWidth;
        A(t);
      },
      disabled: m
    }, P);
  }
  return P;
}
var m = s.forwardRef(g);
m.displayName = "Item";
var v = m;
var y = require("./56697.js");
var h = require("./87995.js");
var b = require("./45406.js");
function w(e) {
  if (typeof MessageChannel === "undefined") {
    (0, b.Z)(e);
  } else {
    var t = new MessageChannel();
    t.port1.onmessage = function () {
      return e();
    };
    t.port2.postMessage(undefined);
  }
}
function x() {
  var e = s.useRef(null);
  function t(t) {
    if (!e.current) {
      e.current = [];
      w(function () {
        (0, h.unstable_batchedUpdates)(function () {
          e.current.forEach(function (e) {
            e();
          });
          e.current = null;
        });
      });
    }
    e.current.push(t);
  }
  return t;
}
function E(e, t) {
  var r = s.useState(t);
  var n = (0, o.Z)(r, 2);
  var i = n[0];
  var a = n[1];
  var u = (0, y.Z)(function (t) {
    e(function () {
      a(t);
    });
  });
  return [i, u];
}
var k = s.createContext(null);
var S = ["component"];
var T = ["className"];
var C = ["className"];
function A(e, t) {
  var r = s.useContext(k);
  if (!r) {
    var i = e.component;
    var o = i === undefined ? "div" : i;
    var u = (0, a.Z)(e, S);
    return s.createElement(o, (0, n.Z)({}, u, {
      ref: t
    }));
  }
  var c = r.className;
  var p = (0, a.Z)(r, T);
  var d = e.className;
  var f = (0, a.Z)(e, C);
  return s.createElement(k.Provider, {
    value: null
  }, s.createElement(v, (0, n.Z)({
    ref: t,
    className: l(c, d)
  }, p, f)));
}
var _ = s.forwardRef(A);
_.displayName = "RawItem";
var O = _;
var M = ["prefixCls", "data", "renderItem", "renderRawItem", "itemKey", "itemWidth", "ssr", "style", "className", "maxCount", "renderRest", "renderRawRest", "suffix", "component", "itemComponent", "onVisibleChange"];
var P = "responsive";
var q = "invalidate";
function N(e) {
  return `+ ${e.length} ...`;
}
function R(e, t) {
  var r = e.prefixCls;
  var u = r === undefined ? "rc-overflow" : r;
  var d = e.data;
  var f = d === undefined ? [] : d;
  var g = e.renderItem;
  var m = e.renderRawItem;
  var y = e.itemKey;
  var h = e.itemWidth;
  var b = h === undefined ? 10 : h;
  var w = e.ssr;
  var S = e.style;
  var T = e.className;
  var C = e.maxCount;
  var A = e.renderRest;
  var _ = e.renderRawRest;
  var O = e.suffix;
  var R = e.component;
  var I = R === undefined ? "div" : R;
  var j = e.itemComponent;
  var D = e.onVisibleChange;
  var L = (0, a.Z)(e, M);
  var F = w === "full";
  var Z = x();
  var z = E(Z, null);
  var U = (0, o.Z)(z, 2);
  var B = U[0];
  var V = U[1];
  var H = B || 0;
  var W = E(Z, new Map());
  var Y = (0, o.Z)(W, 2);
  var Q = Y[0];
  var $ = Y[1];
  var G = E(Z, 0);
  var K = (0, o.Z)(G, 2);
  var J = K[0];
  var X = K[1];
  var ee = E(Z, 0);
  var te = (0, o.Z)(ee, 2);
  var re = te[0];
  var ne = te[1];
  var ie = E(Z, 0);
  var oe = (0, o.Z)(ie, 2);
  var ae = oe[0];
  var se = oe[1];
  var ue = (0, s.useState)(null);
  var le = (0, o.Z)(ue, 2);
  var ce = le[0];
  var pe = le[1];
  var de = (0, s.useState)(null);
  var fe = (0, o.Z)(de, 2);
  var ge = fe[0];
  var me = fe[1];
  var ve = s.useMemo(function () {
    if (ge === null && F) {
      return Number.MAX_SAFE_INTEGER;
    } else {
      return ge || 0;
    }
  }, [ge, B]);
  var ye = (0, s.useState)(false);
  var he = (0, o.Z)(ye, 2);
  var be = he[0];
  var we = he[1];
  var xe = `${u}-item`;
  var Ee = Math.max(J, re);
  var ke = C === P;
  var Se = f.length && ke;
  var Te = C === q;
  var Ce = Se || typeof C === "number" && f.length > C;
  var Ae = (0, s.useMemo)(function () {
    var e = f;
    if (Se) {
      e = B === null && F ? f : f.slice(0, Math.min(f.length, H / b));
    } else if (typeof C === "number") {
      e = f.slice(0, C);
    }
    return e;
  }, [f, b, B, C, Se]);
  var _e = (0, s.useMemo)(function () {
    if (Se) {
      return f.slice(ve + 1);
    } else {
      return f.slice(Ae.length);
    }
  }, [f, Ae, Se, ve]);
  var Oe = (0, s.useCallback)(function (e, t) {
    if (typeof y === "function") {
      return y(e);
    } else {
      return (y && e?.[y]) ?? t;
    }
  }, [y]);
  var Me = (0, s.useCallback)(g || function (e) {
    return e;
  }, [g]);
  function Pe(e, t, r) {
    if (ge !== e || t !== undefined && t !== ce) {
      me(e);
      if (!r) {
        we(e < f.length - 1);
        if (D !== null && D !== undefined) {
          D(e);
        }
      }
      if (t !== undefined) {
        pe(t);
      }
    }
  }
  function qe(e, t) {
    V(t.clientWidth);
  }
  function Ne(e, t) {
    $(function (r) {
      var n = new Map(r);
      if (t === null) {
        n.delete(e);
      } else {
        n.set(e, t);
      }
      return n;
    });
  }
  function Re(e, t) {
    ne(t);
    X(re);
  }
  function Ie(e, t) {
    se(t);
  }
  function je(e) {
    return Q.get(Oe(Ae[e], e));
  }
  (0, p.Z)(function () {
    if (H && typeof Ee === "number" && Ae) {
      var e = ae;
      var t = Ae.length;
      var r = t - 1;
      if (!t) {
        Pe(0, null);
        return;
      }
      for (var n = 0; n < t; n += 1) {
        var i = je(n);
        if (F) {
          i = i || 0;
        }
        if (i === undefined) {
          Pe(n - 1, undefined, true);
          break;
        }
        e += i;
        if (r === 0 && e <= H || n === r - 1 && e + je(r) <= H) {
          Pe(r, null);
          break;
        }
        if (e + Ee > H) {
          Pe(n - 1, e - i - ae + re);
          break;
        }
      }
      if (O && je(0) + ae > H) {
        pe(null);
      }
    }
  }, [H, Q, re, ae, Oe, Ae]);
  var De = be && !!_e.length;
  var Le = {};
  if (ce !== null && Se) {
    Le = {
      position: "absolute",
      left: ce,
      top: 0
    };
  }
  var Fe;
  var Ze = {
    prefixCls: xe,
    responsive: Se,
    component: j,
    invalidate: Te
  };
  var ze = m ? function (e, t) {
    var r = Oe(e, t);
    return s.createElement(k.Provider, {
      key: r,
      value: (0, i.Z)((0, i.Z)({}, Ze), {}, {
        order: t,
        item: e,
        itemKey: r,
        registerSize: Ne,
        display: t <= ve
      })
    }, m(e, t));
  } : function (e, t) {
    var r = Oe(e, t);
    return s.createElement(v, (0, n.Z)({}, Ze, {
      order: t,
      key: r,
      item: e,
      renderItem: Me,
      itemKey: r,
      registerSize: Ne,
      display: t <= ve
    }));
  };
  var Ue = {
    order: De ? ve : Number.MAX_SAFE_INTEGER,
    className: `${xe}-rest`,
    registerSize: Re,
    display: De
  };
  if (_) {
    if (_) {
      Fe = s.createElement(k.Provider, {
        value: (0, i.Z)((0, i.Z)({}, Ze), Ue)
      }, _(_e));
    }
  } else {
    var Be = A || N;
    Fe = s.createElement(v, (0, n.Z)({}, Ze, Ue), typeof Be === "function" ? Be(_e) : Be);
  }
  var Ve = s.createElement(I, (0, n.Z)({
    className: l(!Te && u, T),
    style: S,
    ref: t
  }, L), Ae.map(ze), Ce ? Fe : null, O && s.createElement(v, (0, n.Z)({}, Ze, {
    responsive: ke,
    responsiveDisabled: !Se,
    order: ve,
    className: `${xe}-suffix`,
    registerSize: Ie,
    display: true,
    style: Le
  }), O));
  if (ke) {
    Ve = s.createElement(c.Z, {
      onResize: qe,
      disabled: !Se
    }, Ve);
  }
  return Ve;
}
var I = s.forwardRef(R);
I.displayName = "Overflow";
I.Item = O;
I.RESPONSIVE = P;
I.INVALIDATE = q;
var j = I;
var D = j;
};
