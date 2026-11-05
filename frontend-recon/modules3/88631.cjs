// webpack module 88631 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  lX: function () {
    return q;
  },
  q_: function () {
    return F;
  },
  ob: function () {
    return w;
  },
  PP: function () {
    return z;
  },
  Ep: function () {
    return b;
  },
  Hp: function () {
    return x;
  }
});
var n = require("./34256.js");
function i(e) {
  return e.charAt(0) === "/";
}
function o(e, t) {
  for (var r = t, n = r + 1, i = e.length; n < i; r += 1, n += 1) {
    e[r] = e[n];
  }
  e.pop();
}
function a(e, t = "") {
  var r;
  var n = e && e.split("/") || [];
  var a = t && t.split("/") || [];
  var s = e && i(e);
  var u = t && i(t);
  var l = s || u;
  if (e && i(e)) {
    a = n;
  } else if (n.length) {
    a.pop();
    a = a.concat(n);
  }
  if (!a.length) {
    return "/";
  }
  if (a.length) {
    var c = a[a.length - 1];
    r = c === "." || c === ".." || c === "";
  } else {
    r = false;
  }
  var p = 0;
  for (var d = a.length; d >= 0; d--) {
    var f = a[d];
    if (f === ".") {
      o(a, d);
    } else if (f === "..") {
      o(a, d);
      p++;
    } else if (p) {
      o(a, d);
      p--;
    }
  }
  if (!l) {
    for (; p--; p) {
      a.unshift("..");
    }
  }
  if (!!l && a[0] !== "" && (!a[0] || !i(a[0]))) {
    a.unshift("");
  }
  var g = a.join("/");
  if (r && g.substr(-1) !== "/") {
    g += "/";
  }
  return g;
}
var s = a;
function u(e) {
  if (e.valueOf) {
    return e.valueOf();
  } else {
    return Object.prototype.valueOf.call(e);
  }
}
function l(e, t) {
  if (e === t) {
    return true;
  }
  if (e == null || t == null) {
    return false;
  }
  if (Array.isArray(e)) {
    return Array.isArray(t) && e.length === t.length && e.every(function (e, r) {
      return l(e, t[r]);
    });
  }
  if (typeof e === "object" || typeof t === "object") {
    var r = u(e);
    var n = u(t);
    if (r !== e || n !== t) {
      return l(r, n);
    } else {
      return Object.keys(Object.assign({}, e, t)).every(function (r) {
        return l(e[r], t[r]);
      });
    }
  }
  return false;
}
var c = l;
var p = require("./5873.js");
var d = require("./65946.js");
function f(e) {
  if (e.charAt(0) === "/") {
    return e;
  } else {
    return "/" + e;
  }
}
function g(e) {
  if (e.charAt(0) === "/") {
    return e.substr(1);
  } else {
    return e;
  }
}
function m(e, t) {
  return e.toLowerCase().indexOf(t.toLowerCase()) === 0 && "/?#".indexOf(e.charAt(t.length)) !== -1;
}
function v(e, t) {
  if (m(e, t)) {
    return e.substr(t.length);
  } else {
    return e;
  }
}
function y(e) {
  if (e.charAt(e.length - 1) === "/") {
    return e.slice(0, -1);
  } else {
    return e;
  }
}
function h(e) {
  var t = e || "/";
  var r = "";
  var n = "";
  var i = t.indexOf("#");
  if (i !== -1) {
    n = t.substr(i);
    t = t.substr(0, i);
  }
  var o = t.indexOf("?");
  if (o !== -1) {
    r = t.substr(o);
    t = t.substr(0, o);
  }
  return {
    pathname: t,
    search: r === "?" ? "" : r,
    hash: n === "#" ? "" : n
  };
}
function b(e) {
  var t = e.pathname;
  var r = e.search;
  var n = e.hash;
  var i = t || "/";
  if (r && r !== "?") {
    i += r.charAt(0) === "?" ? r : "?" + r;
  }
  if (n && n !== "#") {
    i += n.charAt(0) === "#" ? n : "#" + n;
  }
  return i;
}
function w(e, t, r, i) {
  var o;
  if (typeof e === "string") {
    o = h(e);
    o.query = o.search ? p.parse(o.search) : {};
    o.state = t;
  } else {
    o = (0, n.Z)({}, e);
    if (o.pathname === undefined) {
      o.pathname = "";
    }
    if (o.search) {
      if (o.search.charAt(0) !== "?") {
        o.search = "?" + o.search;
      }
      o.query = p.parse(o.search);
    } else {
      o.search = o.query ? p.stringify(o.query) : "";
      o.query = o.query || {};
    }
    if (o.hash) {
      if (o.hash.charAt(0) !== "#") {
        o.hash = "#" + o.hash;
      }
    } else {
      o.hash = "";
    }
    if (t !== undefined && o.state === undefined) {
      o.state = t;
    }
  }
  try {
    o.pathname = decodeURI(o.pathname);
  } catch (a) {
    throw a instanceof URIError ? new URIError("Pathname \"" + o.pathname + "\" could not be decoded. This is likely caused by an invalid percent-encoding.") : a;
  }
  if (r) {
    o.key = r;
  }
  if (i) {
    if (o.pathname) {
      if (o.pathname.charAt(0) !== "/") {
        o.pathname = s(o.pathname, i.pathname);
      }
    } else {
      o.pathname = i.pathname;
    }
  } else {
    o.pathname ||= "/";
  }
  return o;
}
function x(e, t) {
  return e.pathname === t.pathname && e.search === t.search && e.hash === t.hash && e.key === t.key && c(e.state, t.state);
}
function E() {
  var e = null;
  function t(t) {
    e = t;
    return function () {
      if (e === t) {
        e = null;
      }
    };
  }
  function r(t, r, n, i) {
    if (e != null) {
      var o = typeof e === "function" ? e(t, r) : e;
      if (typeof o === "string") {
        if (typeof n === "function") {
          n(o, i);
        } else {
          i(true);
        }
      } else {
        i(o !== false);
      }
    } else {
      i(true);
    }
  }
  var n = [];
  function i(e) {
    var t = true;
    function r() {
      if (t) {
        e.apply(undefined, arguments);
      }
    }
    n.push(r);
    return function () {
      t = false;
      n = n.filter(function (e) {
        return e !== r;
      });
    };
  }
  function o() {
    for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
      t[r] = arguments[r];
    }
    n.forEach(function (e) {
      return e.apply(undefined, t);
    });
  }
  return {
    setPrompt: t,
    confirmTransitionTo: r,
    appendListener: i,
    notifyListeners: o
  };
}
var k = typeof window !== "undefined" && !!window.document && !!window.document.createElement;
function S(e, t) {
  t(window.confirm(e));
}
function T() {
  var e = window.navigator.userAgent;
  return (e.indexOf("Android 2.") === -1 && e.indexOf("Android 4.0") === -1 || e.indexOf("Mobile Safari") === -1 || e.indexOf("Chrome") !== -1 || e.indexOf("Windows Phone") !== -1) && window.history && "pushState" in window.history;
}
function C() {
  return window.navigator.userAgent.indexOf("Trident") === -1;
}
function A() {
  return window.navigator.userAgent.indexOf("Firefox") === -1;
}
function _(e) {
  return e.state === undefined && navigator.userAgent.indexOf("CriOS") === -1;
}
var O = "popstate";
var M = "hashchange";
function P() {
  try {
    return window.history.state || {};
  } catch (e) {
    return {};
  }
}
function q(e = {}) {
  if (!k) {
    (0, d.Z)(false);
  }
  var t = window.history;
  var r = T();
  var i = !C();
  var o = e;
  var a = o.forceRefresh;
  var s = a !== undefined && a;
  var u = o.getUserConfirmation;
  var l = u === undefined ? S : u;
  var c = o.keyLength;
  var p = c === undefined ? 6 : c;
  var g = e.basename ? y(f(e.basename)) : "";
  function m(e) {
    var t = e || {};
    var r = t.key;
    var n = t.state;
    var i = window.location;
    var o = i.pathname;
    var a = i.search;
    var s = i.hash;
    var u = o + a + s;
    if (g) {
      u = v(u, g);
    }
    return w(u, n, r);
  }
  function h() {
    return Math.random().toString(36).substr(2, p);
  }
  var x = E();
  function A(e) {
    (0, n.Z)(G, e);
    G.length = t.length;
    x.notifyListeners(G.location, G.action);
  }
  function q(e) {
    if (!_(e)) {
      I(m(e.state));
    }
  }
  function N() {
    I(m(P()));
  }
  var R = false;
  function I(e) {
    if (R) {
      R = false;
      A();
    } else {
      var t = "POP";
      x.confirmTransitionTo(e, t, l, function (r) {
        if (r) {
          A({
            action: t,
            location: e
          });
        } else {
          j(e);
        }
      });
    }
  }
  function j(e) {
    var t = G.location;
    var r = L.indexOf(t.key);
    if (r === -1) {
      r = 0;
    }
    var n = L.indexOf(e.key);
    if (n === -1) {
      n = 0;
    }
    var i = r - n;
    if (i) {
      R = true;
      U(i);
    }
  }
  var D = m(P());
  var L = [D.key];
  function F(e) {
    return g + b(e);
  }
  function Z(e, n) {
    var i = "PUSH";
    var o = w(e, n, h(), G.location);
    x.confirmTransitionTo(o, i, l, function (e) {
      if (e) {
        var n = F(o);
        var a = o.key;
        var u = o.state;
        if (r) {
          t.pushState({
            key: a,
            state: u
          }, null, n);
          if (s) {
            window.location.href = n;
          } else {
            var l = L.indexOf(G.location.key);
            var c = L.slice(0, l + 1);
            c.push(o.key);
            L = c;
            A({
              action: i,
              location: o
            });
          }
        } else {
          window.location.href = n;
        }
      }
    });
  }
  function z(e, n) {
    var i = "REPLACE";
    var o = w(e, n, h(), G.location);
    x.confirmTransitionTo(o, i, l, function (e) {
      if (e) {
        var n = F(o);
        var a = o.key;
        var u = o.state;
        if (r) {
          t.replaceState({
            key: a,
            state: u
          }, null, n);
          if (s) {
            window.location.replace(n);
          } else {
            var l = L.indexOf(G.location.key);
            if (l !== -1) {
              L[l] = o.key;
            }
            A({
              action: i,
              location: o
            });
          }
        } else {
          window.location.replace(n);
        }
      }
    });
  }
  function U(e) {
    t.go(e);
  }
  function B() {
    U(-1);
  }
  function V() {
    U(1);
  }
  var H = 0;
  function W(e) {
    H += e;
    if (H === 1 && e === 1) {
      window.addEventListener(O, q);
      if (i) {
        window.addEventListener(M, N);
      }
    } else if (H === 0) {
      window.removeEventListener(O, q);
      if (i) {
        window.removeEventListener(M, N);
      }
    }
  }
  var Y = false;
  function Q(e = false) {
    var t = x.setPrompt(e);
    if (!Y) {
      W(1);
      Y = true;
    }
    return function () {
      if (Y) {
        Y = false;
        W(-1);
      }
      return t();
    };
  }
  function $(e) {
    var t = x.appendListener(e);
    W(1);
    return function () {
      W(-1);
      t();
    };
  }
  var G = {
    length: t.length,
    action: "POP",
    location: D,
    createHref: F,
    push: Z,
    replace: z,
    go: U,
    goBack: B,
    goForward: V,
    block: Q,
    listen: $
  };
  return G;
}
var N = "hashchange";
var R = {
  hashbang: {
    encodePath: function (e) {
      if (e.charAt(0) === "!") {
        return e;
      } else {
        return "!/" + g(e);
      }
    },
    decodePath: function (e) {
      if (e.charAt(0) === "!") {
        return e.substr(1);
      } else {
        return e;
      }
    }
  },
  noslash: {
    encodePath: g,
    decodePath: f
  },
  slash: {
    encodePath: f,
    decodePath: f
  }
};
function I(e) {
  var t = e.indexOf("#");
  if (t === -1) {
    return e;
  } else {
    return e.slice(0, t);
  }
}
function j() {
  var e = window.location.href;
  var t = e.indexOf("#");
  if (t === -1) {
    return "";
  } else {
    return e.substring(t + 1);
  }
}
function D(e) {
  window.location.hash = e;
}
function L(e) {
  window.location.replace(I(window.location.href) + "#" + e);
}
function F(e = {}) {
  if (!k) {
    (0, d.Z)(false);
  }
  var t = window.history;
  A();
  var r = e;
  var i = r.getUserConfirmation;
  var o = i === undefined ? S : i;
  var a = r.hashType;
  var s = a === undefined ? "slash" : a;
  var u = e.basename ? y(f(e.basename)) : "";
  var l = R[s];
  var c = l.encodePath;
  var p = l.decodePath;
  function g() {
    var e = p(j());
    if (u) {
      e = v(e, u);
    }
    return w(e);
  }
  var m = E();
  function h(e) {
    (0, n.Z)(J, e);
    J.length = t.length;
    m.notifyListeners(J.location, J.action);
  }
  var x = false;
  var T = null;
  function C(e, t) {
    return e.pathname === t.pathname && e.search === t.search && e.hash === t.hash;
  }
  function _() {
    var e = j();
    var t = c(e);
    if (e !== t) {
      L(t);
    } else {
      var r = g();
      var n = J.location;
      if (!x && C(n, r)) {
        return;
      }
      if (T === b(r)) {
        return;
      }
      T = null;
      O(r);
    }
  }
  function O(e) {
    if (x) {
      x = false;
      h();
    } else {
      var t = "POP";
      m.confirmTransitionTo(e, t, o, function (r) {
        if (r) {
          h({
            action: t,
            location: e
          });
        } else {
          M(e);
        }
      });
    }
  }
  function M(e) {
    var t = J.location;
    var r = Z.lastIndexOf(b(t));
    if (r === -1) {
      r = 0;
    }
    var n = Z.lastIndexOf(b(e));
    if (n === -1) {
      n = 0;
    }
    var i = r - n;
    if (i) {
      x = true;
      V(i);
    }
  }
  var P = j();
  var q = c(P);
  if (P !== q) {
    L(q);
  }
  var F = g();
  var Z = [b(F)];
  function z(e) {
    var t = document.querySelector("base");
    var r = "";
    if (t && t.getAttribute("href")) {
      r = I(window.location.href);
    }
    return r + "#" + c(u + b(e));
  }
  function U(e, t) {
    var r = "PUSH";
    var n = w(e, undefined, undefined, J.location);
    m.confirmTransitionTo(n, r, o, function (e) {
      if (e) {
        var t = b(n);
        var i = c(u + t);
        var o = j() !== i;
        if (o) {
          T = t;
          D(i);
          var a = Z.lastIndexOf(b(J.location));
          var s = Z.slice(0, a + 1);
          s.push(t);
          Z = s;
          h({
            action: r,
            location: n
          });
        } else {
          h();
        }
      }
    });
  }
  function B(e, t) {
    var r = "REPLACE";
    var n = w(e, undefined, undefined, J.location);
    m.confirmTransitionTo(n, r, o, function (e) {
      if (e) {
        var t = b(n);
        var i = c(u + t);
        var o = j() !== i;
        if (o) {
          T = t;
          L(i);
        }
        var a = Z.indexOf(b(J.location));
        if (a !== -1) {
          Z[a] = t;
        }
        h({
          action: r,
          location: n
        });
      }
    });
  }
  function V(e) {
    t.go(e);
  }
  function H() {
    V(-1);
  }
  function W() {
    V(1);
  }
  var Y = 0;
  function Q(e) {
    Y += e;
    if (Y === 1 && e === 1) {
      window.addEventListener(N, _);
    } else if (Y === 0) {
      window.removeEventListener(N, _);
    }
  }
  var $ = false;
  function G(e = false) {
    var t = m.setPrompt(e);
    if (!$) {
      Q(1);
      $ = true;
    }
    return function () {
      if ($) {
        $ = false;
        Q(-1);
      }
      return t();
    };
  }
  function K(e) {
    var t = m.appendListener(e);
    Q(1);
    return function () {
      Q(-1);
      t();
    };
  }
  var J = {
    length: t.length,
    action: "POP",
    location: F,
    createHref: z,
    push: U,
    replace: B,
    go: V,
    goBack: H,
    goForward: W,
    block: G,
    listen: K
  };
  return J;
}
function Z(e, t, r) {
  return Math.min(Math.max(e, t), r);
}
function z(e = {}) {
  var t = e;
  var r = t.getUserConfirmation;
  var i = t.initialEntries;
  var o = i === undefined ? ["/"] : i;
  var a = t.initialIndex;
  var s = a === undefined ? 0 : a;
  var u = t.keyLength;
  var l = u === undefined ? 6 : u;
  var c = E();
  function p(e) {
    (0, n.Z)(A, e);
    A.length = A.entries.length;
    c.notifyListeners(A.location, A.action);
  }
  function d() {
    return Math.random().toString(36).substr(2, l);
  }
  var f = Z(s, 0, o.length - 1);
  var g = o.map(function (e) {
    return w(e, undefined, typeof e === "string" ? d() : e.key || d());
  });
  var m = b;
  function v(e, t) {
    var n = "PUSH";
    var i = w(e, t, d(), A.location);
    c.confirmTransitionTo(i, n, r, function (e) {
      if (e) {
        var t = A.index;
        var r = t + 1;
        var o = A.entries.slice(0);
        if (o.length > r) {
          o.splice(r, o.length - r, i);
        } else {
          o.push(i);
        }
        p({
          action: n,
          location: i,
          index: r,
          entries: o
        });
      }
    });
  }
  function y(e, t) {
    var n = "REPLACE";
    var i = w(e, t, d(), A.location);
    c.confirmTransitionTo(i, n, r, function (e) {
      if (e) {
        A.entries[A.index] = i;
        p({
          action: n,
          location: i
        });
      }
    });
  }
  function h(e) {
    var t = Z(A.index + e, 0, A.entries.length - 1);
    var n = "POP";
    var i = A.entries[t];
    c.confirmTransitionTo(i, n, r, function (e) {
      if (e) {
        p({
          action: n,
          location: i,
          index: t
        });
      } else {
        p();
      }
    });
  }
  function x() {
    h(-1);
  }
  function k() {
    h(1);
  }
  function S(e) {
    var t = A.index + e;
    return t >= 0 && t < A.entries.length;
  }
  function T(e = false) {
    return c.setPrompt(e);
  }
  function C(e) {
    return c.appendListener(e);
  }
  var A = {
    length: g.length,
    action: "POP",
    location: g[f],
    index: f,
    entries: g,
    createHref: m,
    push: v,
    replace: y,
    go: h,
    goBack: x,
    goForward: k,
    canGo: S,
    block: T,
    listen: C
  };
  return A;
}
};
