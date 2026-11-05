// webpack module 96598 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  CSSMotionList: function () {
    return we;
  },
  Provider: function () {
    return m;
  },
  default: function () {
    return xe;
  }
});
var n = require("21487");
var i = require("91613");
var o = require("23874");
var a = require("75728");
var s = require("38399");
var u = s;
var l = require("34500");
var c = require("97969");
var p = require("59496");
var d = require("37913");
var f = ["children"];
var g = p.createContext({});
function m(e) {
  var t = e.children;
  var r = (0, d.Z)(e, f);
  return p.createElement(g.Provider, {
    value: r
  }, t);
}
var v = require("8951");
var y = require("45810");
var h = require("78212");
var b = require("19746");
var w = function (e) {
  (0, h.Z)(r, e);
  var t = (0, b.Z)(r);
  function r() {
    (0, v.Z)(this, r);
    return t.apply(this, arguments);
  }
  (0, y.Z)(r, [{
    key: "render",
    value: function () {
      return this.props.children;
    }
  }]);
  return r;
}(p.Component);
var x = w;
var E = require("64515");
var k = "none";
var S = "appear";
var T = "enter";
var C = "leave";
var A = "none";
var _ = "prepare";
var O = "start";
var M = "active";
var P = "end";
var q = "prepared";
var N = require("67361");
function R(e, t) {
  var r = {};
  r[e.toLowerCase()] = t.toLowerCase();
  r[`Webkit${e}`] = `webkit${t}`;
  r[`Moz${e}`] = `moz${t}`;
  r[`ms${e}`] = `MS${t}`;
  r[`O${e}`] = `o${t.toLowerCase()}`;
  return r;
}
function I(e, t) {
  var r = {
    animationend: R("Animation", "AnimationEnd"),
    transitionend: R("Transition", "TransitionEnd")
  };
  if (e) {
    if (!("AnimationEvent" in t)) {
      delete r.animationend.animation;
    }
    if (!("TransitionEvent" in t)) {
      delete r.transitionend.transition;
    }
  }
  return r;
}
var j = I((0, N.Z)(), typeof window !== "undefined" ? window : {});
var D = {};
if ((0, N.Z)()) {
  var L = document.createElement("div");
  D = L.style;
}
var F = {};
function Z(e) {
  if (F[e]) {
    return F[e];
  }
  var t = j[e];
  if (t) {
    var r = Object.keys(t);
    for (var n = r.length, i = 0; i < n; i += 1) {
      var o = r[i];
      if (Object.prototype.hasOwnProperty.call(t, o) && o in D) {
        F[e] = t[o];
        return F[e];
      }
    }
  }
  return "";
}
var z = Z("animationend");
var U = Z("transitionend");
var B = !!z && !!U;
var V = z || "animationend";
var H = U || "transitionend";
function W(e, t) {
  if (!e) {
    return null;
  }
  if ((0, a.Z)(e) === "object") {
    var r = t.replace(/-\w/g, function (e) {
      return e[1].toUpperCase();
    });
    return e[r];
  }
  return `${e}-${t}`;
}
function Y(e) {
  var t = (0, p.useRef)();
  var r = (0, p.useRef)(e);
  r.current = e;
  var n = p.useCallback(function (e) {
    r.current(e);
  }, []);
  function i(e) {
    if (e) {
      e.removeEventListener(H, n);
      e.removeEventListener(V, n);
    }
  }
  function o(e) {
    if (t.current && t.current !== e) {
      i(t.current);
    }
    if (e && e !== t.current) {
      e.addEventListener(H, n);
      e.addEventListener(V, n);
      t.current = e;
    }
  }
  p.useEffect(function () {
    return function () {
      i(t.current);
    };
  }, []);
  return [o, i];
}
var Q = (0, N.Z)() ? p.useLayoutEffect : p.useEffect;
var $ = Q;
var G = require("45406");
function K() {
  var e = p.useRef(null);
  function t() {
    G.Z.cancel(e.current);
  }
  function r(n, i = 2) {
    t();
    var o = (0, G.Z)(function () {
      if (i <= 1) {
        n({
          isCanceled: function () {
            return o !== e.current;
          }
        });
      } else {
        r(n, i - 1);
      }
    });
    e.current = o;
  }
  p.useEffect(function () {
    return function () {
      t();
    };
  }, []);
  return [r, t];
}
var J = [_, O, M, P];
var X = [_, q];
var ee = false;
var te = true;
function re(e) {
  return e === M || e === P;
}
function ne(e, t, r) {
  var n = (0, E.Z)(A);
  var i = (0, o.Z)(n, 2);
  var a = i[0];
  var s = i[1];
  var u = K();
  var l = (0, o.Z)(u, 2);
  var c = l[0];
  var d = l[1];
  function f() {
    s(_, true);
  }
  var g = t ? X : J;
  $(function () {
    if (a !== A && a !== P) {
      var e = g.indexOf(a);
      var t = g[e + 1];
      var n = r(a);
      if (n === ee) {
        s(t, true);
      } else if (t) {
        c(function (e) {
          function r() {
            if (!e.isCanceled()) {
              s(t, true);
            }
          }
          if (n === true) {
            r();
          } else {
            Promise.resolve(n).then(r);
          }
        });
      }
    }
  }, [e, a]);
  p.useEffect(function () {
    return function () {
      d();
    };
  }, []);
  return [f, a];
}
function ie(e, t, r, a) {
  var s = a.motionEnter;
  var u = s === undefined || s;
  var l = a.motionAppear;
  var c = l === undefined || l;
  var d = a.motionLeave;
  var f = d === undefined || d;
  var g = a.motionDeadline;
  var m = a.motionLeaveImmediately;
  var v = a.onAppearPrepare;
  var y = a.onEnterPrepare;
  var h = a.onLeavePrepare;
  var b = a.onAppearStart;
  var w = a.onEnterStart;
  var x = a.onLeaveStart;
  var A = a.onAppearActive;
  var P = a.onEnterActive;
  var N = a.onLeaveActive;
  var R = a.onAppearEnd;
  var I = a.onEnterEnd;
  var j = a.onLeaveEnd;
  var D = a.onVisibleChanged;
  var L = (0, E.Z)();
  var F = (0, o.Z)(L, 2);
  var Z = F[0];
  var z = F[1];
  var U = (0, E.Z)(k);
  var B = (0, o.Z)(U, 2);
  var V = B[0];
  var H = B[1];
  var W = (0, E.Z)(null);
  var Q = (0, o.Z)(W, 2);
  var G = Q[0];
  var K = Q[1];
  var J = (0, p.useRef)(false);
  var X = (0, p.useRef)(null);
  function ie() {
    return r();
  }
  var oe = (0, p.useRef)(false);
  function ae() {
    H(k, true);
    K(null, true);
  }
  function se(e) {
    var t = ie();
    if (!e || e.deadline || e.target === t) {
      var r;
      var n = oe.current;
      if (V === S && n) {
        r = R === null || R === undefined ? undefined : R(t, e);
      } else if (V === T && n) {
        r = I === null || I === undefined ? undefined : I(t, e);
      } else if (V === C && n) {
        r = j === null || j === undefined ? undefined : j(t, e);
      }
      if (V !== k && n && r !== false) {
        ae();
      }
    }
  }
  var ue = Y(se);
  var le = (0, o.Z)(ue, 1);
  var ce = le[0];
  function pe(e) {
    var t;
    var r;
    var i;
    switch (e) {
      case S:
        t = {};
        (0, n.Z)(t, _, v);
        (0, n.Z)(t, O, b);
        (0, n.Z)(t, M, A);
        return t;
      case T:
        r = {};
        (0, n.Z)(r, _, y);
        (0, n.Z)(r, O, w);
        (0, n.Z)(r, M, P);
        return r;
      case C:
        i = {};
        (0, n.Z)(i, _, h);
        (0, n.Z)(i, O, x);
        (0, n.Z)(i, M, N);
        return i;
      default:
        return {};
    }
  }
  var de = p.useMemo(function () {
    return pe(V);
  }, [V]);
  var fe = ne(V, !e, function (e) {
    if (e === _) {
      var t = de[_];
      if (t) {
        return t(ie());
      } else {
        return ee;
      }
    }
    var r;
    if (ve in de) {
      K(((r = de[ve]) === null || r === undefined ? undefined : r.call(de, ie(), null)) || null);
    }
    if (ve === M) {
      ce(ie());
      if (g > 0) {
        clearTimeout(X.current);
        X.current = setTimeout(function () {
          se({
            deadline: true
          });
        }, g);
      }
    }
    if (ve === q) {
      ae();
    }
    return te;
  });
  var ge = (0, o.Z)(fe, 2);
  var me = ge[0];
  var ve = ge[1];
  var ye = re(ve);
  oe.current = ye;
  $(function () {
    z(t);
    var r;
    var n = J.current;
    J.current = true;
    if (!n && t && c) {
      r = S;
    }
    if (n && t && u) {
      r = T;
    }
    if (n && !t && f || !n && m && !t && f) {
      r = C;
    }
    var i = pe(r);
    if (r && (e || i[_])) {
      H(r);
      me();
    } else {
      H(k);
    }
  }, [t]);
  (0, p.useEffect)(function () {
    if (V === S && !c || V === T && !u || V === C && !f) {
      H(k);
    }
  }, [c, u, f]);
  (0, p.useEffect)(function () {
    return function () {
      J.current = false;
      clearTimeout(X.current);
    };
  }, []);
  var he = p.useRef(false);
  (0, p.useEffect)(function () {
    if (Z) {
      he.current = true;
    }
    if (Z !== undefined && V === k) {
      if (he.current || Z) {
        if (D !== null && D !== undefined) {
          D(Z);
        }
      }
      he.current = true;
    }
  }, [Z, V]);
  var be = G;
  if (de[_] && ve === O) {
    be = (0, i.Z)({
      transition: "none"
    }, be);
  }
  return [V, ve, be, Z ?? t];
}
function oe(e) {
  var t = e;
  function r(e, r) {
    return !!e.motionName && !!t && r !== false;
  }
  if ((0, a.Z)(e) === "object") {
    t = e.transitionSupport;
  }
  var s = p.forwardRef(function (e, t) {
    var a = e.visible;
    var s = a === undefined || a;
    var d = e.removeOnLeave;
    var f = d === undefined || d;
    var m = e.forceRender;
    var v = e.children;
    var y = e.motionName;
    var h = e.leavedClassName;
    var b = e.eventProps;
    var w = p.useContext(g);
    var E = w.motion;
    var S = r(e, E);
    var T = (0, p.useRef)();
    var C = (0, p.useRef)();
    function A() {
      try {
        if (T.current instanceof HTMLElement) {
          return T.current;
        } else {
          return (0, l.Z)(C.current);
        }
      } catch (e) {
        return null;
      }
    }
    var M = ie(S, s, A, e);
    var P = (0, o.Z)(M, 4);
    var q = P[0];
    var N = P[1];
    var R = P[2];
    var I = P[3];
    var j = p.useRef(I);
    if (I) {
      j.current = true;
    }
    var D;
    var L = p.useCallback(function (e) {
      T.current = e;
      (0, c.mH)(t, e);
    }, [t]);
    var F = (0, i.Z)((0, i.Z)({}, b), {}, {
      visible: s
    });
    if (v) {
      if (q === k) {
        D = I ? v((0, i.Z)({}, F), L) : !f && j.current && h ? v((0, i.Z)((0, i.Z)({}, F), {}, {
          className: h
        }), L) : m || !f && !h ? v((0, i.Z)((0, i.Z)({}, F), {}, {
          style: {
            display: "none"
          }
        }), L) : null;
      } else {
        var Z;
        var z;
        if (N === _) {
          z = "prepare";
        } else if (re(N)) {
          z = "active";
        } else if (N === O) {
          z = "start";
        }
        var U = W(y, `${q}-${z}`);
        D = v((0, i.Z)((0, i.Z)({}, F), {}, {
          className: u(W(y, q), (Z = {}, (0, n.Z)(Z, U, U && z), (0, n.Z)(Z, y, typeof y === "string"), Z)),
          style: R
        }), L);
      }
    } else {
      D = null;
    }
    if (p.isValidElement(D) && (0, c.Yr)(D)) {
      var B = D;
      var V = B.ref;
      if (!V) {
        D = p.cloneElement(D, {
          ref: L
        });
      }
    }
    return p.createElement(x, {
      ref: C
    }, D);
  });
  s.displayName = "CSSMotion";
  return s;
}
var ae = oe(B);
var se = require("34256");
var ue = require("39695");
var le = "add";
var ce = "keep";
var pe = "remove";
var de = "removed";
function fe(e) {
  var t;
  t = e && (0, a.Z)(e) === "object" && "key" in e ? e : {
    key: e
  };
  return (0, i.Z)((0, i.Z)({}, t), {}, {
    key: String(t.key)
  });
}
function ge(e = []) {
  return e.map(fe);
}
function me(e = [], t = []) {
  var r = [];
  var n = 0;
  var o = t.length;
  var a = ge(e);
  var s = ge(t);
  a.forEach(function (e) {
    var t = false;
    for (var a = n; a < o; a += 1) {
      var u = s[a];
      if (u.key === e.key) {
        if (n < a) {
          r = r.concat(s.slice(n, a).map(function (e) {
            return (0, i.Z)((0, i.Z)({}, e), {}, {
              status: le
            });
          }));
          n = a;
        }
        r.push((0, i.Z)((0, i.Z)({}, u), {}, {
          status: ce
        }));
        n += 1;
        t = true;
        break;
      }
    }
    if (!t) {
      r.push((0, i.Z)((0, i.Z)({}, e), {}, {
        status: pe
      }));
    }
  });
  if (n < o) {
    r = r.concat(s.slice(n).map(function (e) {
      return (0, i.Z)((0, i.Z)({}, e), {}, {
        status: le
      });
    }));
  }
  var u = {};
  r.forEach(function (e) {
    var t = e.key;
    u[t] = (u[t] || 0) + 1;
  });
  var l = Object.keys(u).filter(function (e) {
    return u[e] > 1;
  });
  l.forEach(function (e) {
    r = r.filter(function (t) {
      var r = t.key;
      var n = t.status;
      return r !== e || n !== pe;
    });
    r.forEach(function (t) {
      if (t.key === e) {
        t.status = ce;
      }
    });
  });
  return r;
}
var ve = ["component", "children", "onVisibleChanged", "onAllRemoved"];
var ye = ["status"];
var he = ["eventProps", "visible", "children", "motionName", "motionAppear", "motionEnter", "motionLeave", "motionLeaveImmediately", "motionDeadline", "removeOnLeave", "leavedClassName", "onAppearPrepare", "onAppearStart", "onAppearActive", "onAppearEnd", "onEnterStart", "onEnterActive", "onEnterEnd", "onLeaveStart", "onLeaveActive", "onLeaveEnd"];
function be(e, t = ae) {
  var r = function (e) {
    (0, h.Z)(o, e);
    var r = (0, b.Z)(o);
    function o() {
      var e;
      (0, v.Z)(this, o);
      for (var t = arguments.length, a = new Array(t), s = 0; s < t; s++) {
        a[s] = arguments[s];
      }
      e = r.call.apply(r, [this].concat(a));
      (0, n.Z)((0, ue.Z)(e), "state", {
        keyEntities: []
      });
      (0, n.Z)((0, ue.Z)(e), "removeKey", function (t) {
        var r = e.state.keyEntities;
        var n = r.map(function (e) {
          if (e.key !== t) {
            return e;
          } else {
            return (0, i.Z)((0, i.Z)({}, e), {}, {
              status: de
            });
          }
        });
        e.setState({
          keyEntities: n
        });
        return n.filter(function (e) {
          var t = e.status;
          return t !== de;
        }).length;
      });
      return e;
    }
    (0, y.Z)(o, [{
      key: "render",
      value: function () {
        var e = this;
        var r = this.state.keyEntities;
        var n = this.props;
        var o = n.component;
        var a = n.children;
        var s = n.onVisibleChanged;
        var u = n.onAllRemoved;
        var l = (0, d.Z)(n, ve);
        var c = o || p.Fragment;
        var f = {};
        he.forEach(function (e) {
          f[e] = l[e];
          delete l[e];
        });
        delete l.keys;
        return p.createElement(c, l, r.map(function (r, n) {
          var o = r.status;
          var l = (0, d.Z)(r, ye);
          var c = o === le || o === ce;
          return p.createElement(t, (0, se.Z)({}, f, {
            key: l.key,
            visible: c,
            eventProps: l,
            onVisibleChanged: function (t) {
              if (s !== null && s !== undefined) {
                s(t, {
                  key: l.key
                });
              }
              if (!t) {
                var r = e.removeKey(l.key);
                if (r === 0 && u) {
                  u();
                }
              }
            }
          }), function (e, t) {
            return a((0, i.Z)((0, i.Z)({}, e), {}, {
              index: n
            }), t);
          });
        }));
      }
    }], [{
      key: "getDerivedStateFromProps",
      value: function (e, t) {
        var r = e.keys;
        var n = t.keyEntities;
        var i = ge(r);
        var o = me(n, i);
        return {
          keyEntities: o.filter(function (e) {
            var t = n.find(function (t) {
              var r = t.key;
              return e.key === r;
            });
            return !t || t.status !== de || e.status !== pe;
          })
        };
      }
    }]);
    return o;
  }(p.Component);
  (0, n.Z)(r, "defaultProps", {
    component: "div"
  });
  return r;
}
var we = be(B);
var xe = ae;
};
