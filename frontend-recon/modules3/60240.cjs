// webpack module 60240 — body from webcrack
module.exports = function (module, exports, require) {
var n = typeof Map === "function" && Map.prototype;
var i = Object.getOwnPropertyDescriptor && n ? Object.getOwnPropertyDescriptor(Map.prototype, "size") : null;
var o = n && i && typeof i.get === "function" ? i.get : null;
var a = n && Map.prototype.forEach;
var s = typeof Set === "function" && Set.prototype;
var u = Object.getOwnPropertyDescriptor && s ? Object.getOwnPropertyDescriptor(Set.prototype, "size") : null;
var l = s && u && typeof u.get === "function" ? u.get : null;
var c = s && Set.prototype.forEach;
var p = typeof WeakMap === "function" && WeakMap.prototype;
var d = p ? WeakMap.prototype.has : null;
var f = typeof WeakSet === "function" && WeakSet.prototype;
var g = f ? WeakSet.prototype.has : null;
var m = typeof WeakRef === "function" && WeakRef.prototype;
var v = m ? WeakRef.prototype.deref : null;
var y = Boolean.prototype.valueOf;
var h = Object.prototype.toString;
var b = Function.prototype.toString;
var w = String.prototype.match;
var x = String.prototype.slice;
var E = String.prototype.replace;
var k = String.prototype.toUpperCase;
var S = String.prototype.toLowerCase;
var T = RegExp.prototype.test;
var C = Array.prototype.concat;
var A = Array.prototype.join;
var _ = Array.prototype.slice;
var O = Math.floor;
var M = typeof BigInt === "function" ? BigInt.prototype.valueOf : null;
var P = Object.getOwnPropertySymbols;
var q = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? Symbol.prototype.toString : null;
var N = typeof Symbol === "function" && typeof Symbol.iterator === "object";
var R = typeof Symbol === "function" && Symbol.toStringTag && (typeof Symbol.toStringTag === N || "symbol") ? Symbol.toStringTag : null;
var I = Object.prototype.propertyIsEnumerable;
var j = (typeof Reflect === "function" ? Reflect.getPrototypeOf : Object.getPrototypeOf) || ([].__proto__ === Array.prototype ? function (e) {
  return e.__proto__;
} : null);
function D(e, t) {
  if (e === Infinity || e === -Infinity || e !== e || e && e > -1000 && e < 1000 || T.call(/e/, t)) {
    return t;
  }
  var r = /[0-9](?=(?:[0-9]{3})+(?![0-9]))/g;
  if (typeof e === "number") {
    var n = e < 0 ? -O(-e) : O(e);
    if (n !== e) {
      var i = String(n);
      var o = x.call(t, i.length + 1);
      return E.call(i, r, "$&_") + "." + E.call(E.call(o, /([0-9]{3})/g, "$&_"), /_$/, "");
    }
  }
  return E.call(t, r, "$&_");
}
var L = require("./71568.js");
var F = L.custom;
var Z = X(F) ? F : null;
var z = {
  __proto__: null,
  double: "\"",
  single: "'"
};
var U = {
  __proto__: null,
  double: /(["\\])/g,
  single: /(['\\])/g
};
function B(e, t, r) {
  var n = r.quoteStyle || t;
  var i = z[n];
  return i + e + i;
}
function V(e) {
  return E.call(String(e), /"/g, "&quot;");
}
function H(e) {
  return !R || typeof e !== "object" || !(R in e) && typeof e[R] === "undefined";
}
function W(e) {
  return ne(e) === "[object Array]" && H(e);
}
function Y(e) {
  return ne(e) === "[object Date]" && H(e);
}
function Q(e) {
  return ne(e) === "[object RegExp]" && H(e);
}
function $(e) {
  return ne(e) === "[object Error]" && H(e);
}
function G(e) {
  return ne(e) === "[object String]" && H(e);
}
function K(e) {
  return ne(e) === "[object Number]" && H(e);
}
function J(e) {
  return ne(e) === "[object Boolean]" && H(e);
}
function X(e) {
  if (N) {
    return e && typeof e === "object" && e instanceof Symbol;
  }
  if (typeof e === "symbol") {
    return true;
  }
  if (!e || typeof e !== "object" || !q) {
    return false;
  }
  try {
    q.call(e);
    return true;
  } catch (t) {}
  return false;
}
function ee(e) {
  if (!e || typeof e !== "object" || !M) {
    return false;
  }
  try {
    M.call(e);
    return true;
  } catch (t) {}
  return false;
}
module.exports = function e(t, n, i, s) {
  var u = n || {};
  if (re(u, "quoteStyle") && !re(z, u.quoteStyle)) {
    throw new TypeError("option \"quoteStyle\" must be \"single\" or \"double\"");
  }
  if (re(u, "maxStringLength") && (typeof u.maxStringLength === "number" ? u.maxStringLength < 0 && u.maxStringLength !== Infinity : u.maxStringLength !== null)) {
    throw new TypeError("option \"maxStringLength\", if provided, must be a positive integer, Infinity, or `null`");
  }
  var p = !re(u, "customInspect") || u.customInspect;
  if (typeof p !== "boolean" && p !== "symbol") {
    throw new TypeError("option \"customInspect\", if provided, must be `true`, `false`, or `'symbol'`");
  }
  if (re(u, "indent") && u.indent !== null && u.indent !== "\t" && (parseInt(u.indent, 10) !== u.indent || !(u.indent > 0))) {
    throw new TypeError("option \"indent\" must be \"\\t\", an integer > 0, or `null`");
  }
  if (re(u, "numericSeparator") && typeof u.numericSeparator !== "boolean") {
    throw new TypeError("option \"numericSeparator\", if provided, must be `true` or `false`");
  }
  var d = u.numericSeparator;
  if (typeof t === "undefined") {
    return "undefined";
  }
  if (t === null) {
    return "null";
  }
  if (typeof t === "boolean") {
    if (t) {
      return "true";
    } else {
      return "false";
    }
  }
  if (typeof t === "string") {
    return de(t, u);
  }
  if (typeof t === "number") {
    if (t === 0) {
      if (Infinity / t > 0) {
        return "0";
      } else {
        return "-0";
      }
    }
    var f = String(t);
    if (d) {
      return D(t, f);
    } else {
      return f;
    }
  }
  if (typeof t === "bigint") {
    var g = String(t) + "n";
    if (d) {
      return D(t, g);
    } else {
      return g;
    }
  }
  var m = typeof u.depth === "undefined" ? 5 : u.depth;
  if (typeof i === "undefined") {
    i = 0;
  }
  if (i >= m && m > 0 && typeof t === "object") {
    if (W(t)) {
      return "[Array]";
    } else {
      return "[Object]";
    }
  }
  var v = he(u, i);
  if (typeof s === "undefined") {
    s = [];
  } else if (oe(s, t) >= 0) {
    return "[Circular]";
  }
  function h(t, r, n) {
    if (r) {
      s = _.call(s);
      s.push(r);
    }
    if (n) {
      var o = {
        depth: u.depth
      };
      if (re(u, "quoteStyle")) {
        o.quoteStyle = u.quoteStyle;
      }
      return e(t, o, i + 1, s);
    }
    return e(t, u, i + 1, s);
  }
  if (typeof t === "function" && !Q(t)) {
    var b = ie(t);
    var w = we(t, h);
    return "[Function" + (b ? ": " + b : " (anonymous)") + "]" + (w.length > 0 ? " { " + A.call(w, ", ") + " }" : "");
  }
  if (X(t)) {
    var k = N ? E.call(String(t), /^(Symbol\(.*\))_[^)]*$/, "$1") : q.call(t);
    if (typeof t !== "object" || N) {
      return k;
    } else {
      return ge(k);
    }
  }
  if (pe(t)) {
    var T = "<" + S.call(String(t.nodeName));
    for (var O = t.attributes || [], P = 0; P < O.length; P++) {
      T += " " + O[P].name + "=" + B(V(O[P].value), "double", u);
    }
    T += ">";
    if (t.childNodes && t.childNodes.length) {
      T += "...";
    }
    T += "</" + S.call(String(t.nodeName)) + ">";
    return T;
  }
  if (W(t)) {
    if (t.length === 0) {
      return "[]";
    }
    var F = we(t, h);
    if (v && !ye(F)) {
      return "[" + be(F, v) + "]";
    } else {
      return "[ " + A.call(F, ", ") + " ]";
    }
  }
  if ($(t)) {
    var U = we(t, h);
    if ("cause" in Error.prototype || !("cause" in t) || I.call(t, "cause")) {
      if (U.length === 0) {
        return "[" + String(t) + "]";
      } else {
        return "{ [" + String(t) + "] " + A.call(U, ", ") + " }";
      }
    } else {
      return "{ [" + String(t) + "] " + A.call(C.call("[cause]: " + h(t.cause), U), ", ") + " }";
    }
  }
  if (typeof t === "object" && p) {
    if (Z && typeof t[Z] === "function" && L) {
      return L(t, {
        depth: m - i
      });
    }
    if (p !== "symbol" && typeof t.inspect === "function") {
      return t.inspect();
    }
  }
  if (ae(t)) {
    var H = [];
    if (a) {
      a.call(t, function (e, r) {
        H.push(h(r, t, true) + " => " + h(e, t));
      });
    }
    return ve("Map", o.call(t), H, v);
  }
  if (le(t)) {
    var te = [];
    if (c) {
      c.call(t, function (e) {
        te.push(h(e, t));
      });
    }
    return ve("Set", l.call(t), te, v);
  }
  if (se(t)) {
    return me("WeakMap");
  }
  if (ce(t)) {
    return me("WeakSet");
  }
  if (ue(t)) {
    return me("WeakRef");
  }
  if (K(t)) {
    return ge(h(Number(t)));
  }
  if (ee(t)) {
    return ge(h(M.call(t)));
  }
  if (J(t)) {
    return ge(y.call(t));
  }
  if (G(t)) {
    return ge(h(String(t)));
  }
  if (typeof window !== "undefined" && t === window) {
    return "{ [object Window] }";
  }
  if (typeof globalThis !== "undefined" && t === globalThis || typeof require.g !== "undefined" && t === require.g) {
    return "{ [object globalThis] }";
  }
  if (!Y(t) && !Q(t)) {
    var fe = we(t, h);
    var xe = j ? j(t) === Object.prototype : t instanceof Object || t.constructor === Object;
    var Ee = t instanceof Object ? "" : "null prototype";
    var ke = !xe && R && Object(t) === t && R in t ? x.call(ne(t), 8, -1) : Ee ? "Object" : "";
    var Se = xe || typeof t.constructor !== "function" ? "" : t.constructor.name ? t.constructor.name + " " : "";
    var Te = Se + (ke || Ee ? "[" + A.call(C.call([], ke || [], Ee || []), ": ") + "] " : "");
    if (fe.length === 0) {
      return Te + "{}";
    } else if (v) {
      return Te + "{" + be(fe, v) + "}";
    } else {
      return Te + "{ " + A.call(fe, ", ") + " }";
    }
  }
  return String(t);
};
var te = Object.prototype.hasOwnProperty || function (e) {
  return e in this;
};
function re(e, t) {
  return te.call(e, t);
}
function ne(e) {
  return h.call(e);
}
function ie(e) {
  if (e.name) {
    return e.name;
  }
  var t = w.call(b.call(e), /^function\s*([\w$]+)/);
  if (t) {
    return t[1];
  } else {
    return null;
  }
}
function oe(e, t) {
  if (e.indexOf) {
    return e.indexOf(t);
  }
  for (var r = 0, n = e.length; r < n; r++) {
    if (e[r] === t) {
      return r;
    }
  }
  return -1;
}
function ae(e) {
  if (!o || !e || typeof e !== "object") {
    return false;
  }
  try {
    o.call(e);
    try {
      l.call(e);
    } catch (t) {
      return true;
    }
    return e instanceof Map;
  } catch (r) {}
  return false;
}
function se(e) {
  if (!d || !e || typeof e !== "object") {
    return false;
  }
  try {
    d.call(e, d);
    try {
      g.call(e, g);
    } catch (t) {
      return true;
    }
    return e instanceof WeakMap;
  } catch (r) {}
  return false;
}
function ue(e) {
  if (!v || !e || typeof e !== "object") {
    return false;
  }
  try {
    v.call(e);
    return true;
  } catch (t) {}
  return false;
}
function le(e) {
  if (!l || !e || typeof e !== "object") {
    return false;
  }
  try {
    l.call(e);
    try {
      o.call(e);
    } catch (t) {
      return true;
    }
    return e instanceof Set;
  } catch (r) {}
  return false;
}
function ce(e) {
  if (!g || !e || typeof e !== "object") {
    return false;
  }
  try {
    g.call(e, g);
    try {
      d.call(e, d);
    } catch (t) {
      return true;
    }
    return e instanceof WeakSet;
  } catch (r) {}
  return false;
}
function pe(e) {
  return !!e && typeof e === "object" && (typeof HTMLElement !== "undefined" && e instanceof HTMLElement || typeof e.nodeName === "string" && typeof e.getAttribute === "function");
}
function de(e, t) {
  if (e.length > t.maxStringLength) {
    var r = e.length - t.maxStringLength;
    var n = "... " + r + " more character" + (r > 1 ? "s" : "");
    return de(x.call(e, 0, t.maxStringLength), t) + n;
  }
  var i = U[t.quoteStyle || "single"];
  i.lastIndex = 0;
  var o = E.call(E.call(e, i, "\\$1"), /[\x00-\x1f]/g, fe);
  return B(o, "single", t);
}
function fe(e) {
  var t = e.charCodeAt(0);
  var r = {
    8: "b",
    9: "t",
    10: "n",
    12: "f",
    13: "r"
  }[t];
  if (r) {
    return "\\" + r;
  } else {
    return "\\x" + (t < 16 ? "0" : "") + k.call(t.toString(16));
  }
}
function ge(e) {
  return "Object(" + e + ")";
}
function me(e) {
  return e + " { ? }";
}
function ve(e, t, r, n) {
  var i = n ? be(r, n) : A.call(r, ", ");
  return e + " (" + t + ") {" + i + "}";
}
function ye(e) {
  for (var t = 0; t < e.length; t++) {
    if (oe(e[t], "\n") >= 0) {
      return false;
    }
  }
  return true;
}
function he(e, t) {
  var r;
  if (e.indent === "\t") {
    r = "\t";
  } else {
    if (typeof e.indent !== "number" || !(e.indent > 0)) {
      return null;
    }
    r = A.call(Array(e.indent + 1), " ");
  }
  return {
    base: r,
    prev: A.call(Array(t + 1), r)
  };
}
function be(e, t) {
  if (e.length === 0) {
    return "";
  }
  var r = "\n" + t.prev + t.base;
  return r + A.call(e, "," + r) + "\n" + t.prev;
}
function we(e, t) {
  var r = W(e);
  var n = [];
  if (r) {
    n.length = e.length;
    for (var i = 0; i < e.length; i++) {
      n[i] = re(e, i) ? t(e[i], e) : "";
    }
  }
  var o;
  var a = typeof P === "function" ? P(e) : [];
  if (N) {
    o = {};
    for (var s = 0; s < a.length; s++) {
      o["$" + a[s]] = a[s];
    }
  }
  for (var u in e) {
    if (re(e, u)) {
      if ((!r || String(Number(u)) !== u || !(u < e.length)) && (!N || !(o["$" + u] instanceof Symbol))) {
        if (T.call(/[^\w$]/, u)) {
          n.push(t(u, e) + ": " + t(e[u], e));
        } else {
          n.push(u + ": " + t(e[u], e));
        }
      }
    }
  }
  if (typeof P === "function") {
    for (var l = 0; l < a.length; l++) {
      if (I.call(e, a[l])) {
        n.push("[" + t(a[l]) + "]: " + t(e[a[l]], e));
      }
    }
  }
  return n;
}
};
