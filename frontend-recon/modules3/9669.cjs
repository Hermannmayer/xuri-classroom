// webpack module 9669 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./90889.js");
var i = require("./60316.js");
var o = Object.prototype.hasOwnProperty;
var a = Array.isArray;
var s = i();
function u(e, t) {
  s.set(e, t);
  return e;
}
function l(e) {
  return s.has(e);
}
function c(e) {
  return s.get(e);
}
function p(e, t) {
  s.set(e, t);
}
var d = function () {
  var e = [];
  for (var t = 0; t < 256; ++t) {
    e[e.length] = "%" + ((t < 16 ? "0" : "") + t.toString(16)).toUpperCase();
  }
  return e;
}();
function f(e) {
  while (e.length > 1) {
    var t = e.pop();
    var r = t.obj[t.prop];
    if (a(r)) {
      var n = [];
      for (var i = 0; i < r.length; ++i) {
        if (typeof r[i] !== "undefined") {
          n[n.length] = r[i];
        }
      }
      t.obj[t.prop] = n;
    }
  }
}
function g(e, t) {
  var r = t && t.plainObjects ? {
    __proto__: null
  } : {};
  for (var n = 0; n < e.length; ++n) {
    if (typeof e[n] !== "undefined") {
      r[n] = e[n];
    }
  }
  return r;
}
var m = function e(t, r, n) {
  if (!r) {
    return t;
  }
  if (typeof r !== "object" && typeof r !== "function") {
    if (a(t)) {
      var i = t.length;
      if (n && typeof n.arrayLimit === "number" && i > n.arrayLimit) {
        return u(g(t.concat(r), n), i);
      }
      t[i] = r;
    } else {
      if (!t || typeof t !== "object") {
        return [t, r];
      }
      if (l(t)) {
        var s = c(t) + 1;
        t[s] = r;
        p(t, s);
      } else {
        if (n && n.strictMerge) {
          return [t, r];
        }
        if (n && (n.plainObjects || n.allowPrototypes) || !o.call(Object.prototype, r)) {
          t[r] = true;
        }
      }
    }
    return t;
  }
  if (!t || typeof t !== "object") {
    if (l(r)) {
      for (var d = Object.keys(r), f = n && n.plainObjects ? {
          __proto__: null,
          0: t
        } : {
          0: t
        }, m = 0; m < d.length; m++) {
        var v = parseInt(d[m], 10);
        f[v + 1] = r[d[m]];
      }
      return u(f, c(r) + 1);
    }
    var y = [t].concat(r);
    if (n && typeof n.arrayLimit === "number" && y.length > n.arrayLimit) {
      return u(g(y, n), y.length - 1);
    } else {
      return y;
    }
  }
  var h = t;
  if (a(t) && !a(r)) {
    h = g(t, n);
  }
  if (a(t) && a(r)) {
    r.forEach(function (r, i) {
      if (o.call(t, i)) {
        var a = t[i];
        if (a && typeof a === "object" && r && typeof r === "object") {
          t[i] = e(a, r, n);
        } else {
          t[t.length] = r;
        }
      } else {
        t[i] = r;
      }
    });
    return t;
  } else {
    return Object.keys(r).reduce(function (t, i) {
      var a = r[i];
      if (o.call(t, i)) {
        t[i] = e(t[i], a, n);
      } else {
        t[i] = a;
      }
      if (l(r) && !l(t)) {
        u(t, c(r));
      }
      if (l(t)) {
        var s = parseInt(i, 10);
        if (String(s) === i && s >= 0 && s > c(t)) {
          p(t, s);
        }
      }
      return t;
    }, h);
  }
};
function v(e, t) {
  return Object.keys(t).reduce(function (e, r) {
    e[r] = t[r];
    return e;
  }, e);
}
function y(e, t, r) {
  var n = e.replace(/\+/g, " ");
  if (r === "iso-8859-1") {
    return n.replace(/%[0-9a-f]{2}/gi, unescape);
  }
  try {
    return decodeURIComponent(n);
  } catch (i) {
    return n;
  }
}
var h = 1024;
function b(e, t, r, i, o) {
  if (e.length === 0) {
    return e;
  }
  var a = e;
  if (typeof e === "symbol") {
    a = Symbol.prototype.toString.call(e);
  } else if (typeof e !== "string") {
    a = String(e);
  }
  if (r === "iso-8859-1") {
    return escape(a).replace(/%u[0-9a-f]{4}/gi, function (e) {
      return "%26%23" + parseInt(e.slice(2), 16) + "%3B";
    });
  }
  var s = "";
  for (var u = 0; u < a.length; u += h) {
    for (var l = a.length >= h ? a.slice(u, u + h) : a, c = [], p = 0; p < l.length; ++p) {
      var f = l.charCodeAt(p);
      if (f === 45 || f === 46 || f === 95 || f === 126 || f >= 48 && f <= 57 || f >= 65 && f <= 90 || f >= 97 && f <= 122 || o === n.RFC1738 && (f === 40 || f === 41)) {
        c[c.length] = l.charAt(p);
      } else if (f < 128) {
        c[c.length] = d[f];
      } else if (f < 2048) {
        c[c.length] = d[f >> 6 | 192] + d[f & 63 | 128];
      } else if (f < 55296 || f >= 57344) {
        c[c.length] = d[f >> 12 | 224] + d[f >> 6 & 63 | 128] + d[f & 63 | 128];
      } else {
        p += 1;
        f = 65536 + ((f & 1023) << 10 | l.charCodeAt(p) & 1023);
        c[c.length] = d[f >> 18 | 240] + d[f >> 12 & 63 | 128] + d[f >> 6 & 63 | 128] + d[f & 63 | 128];
      }
    }
    s += c.join("");
  }
  return s;
}
function w(e) {
  for (var t = [{
      obj: {
        o: e
      },
      prop: "o"
    }], r = [], n = 0; n < t.length; ++n) {
    var i = t[n];
    var o = i.obj[i.prop];
    for (var a = Object.keys(o), s = 0; s < a.length; ++s) {
      var u = a[s];
      var l = o[u];
      if (typeof l === "object" && l !== null && r.indexOf(l) === -1) {
        t[t.length] = {
          obj: o,
          prop: u
        };
        r[r.length] = l;
      }
    }
  }
  f(t);
  return e;
}
function x(e) {
  return Object.prototype.toString.call(e) === "[object RegExp]";
}
function E(e) {
  return !!e && typeof e === "object" && !!e.constructor && !!e.constructor.isBuffer && !!e.constructor.isBuffer(e);
}
function k(e, t, r, n) {
  if (l(e)) {
    var i = c(e) + 1;
    e[i] = t;
    p(e, i);
    return e;
  }
  var o = [].concat(e, t);
  if (o.length > r) {
    return u(g(o, {
      plainObjects: n
    }), o.length - 1);
  } else {
    return o;
  }
}
function S(e, t) {
  if (a(e)) {
    var r = [];
    for (var n = 0; n < e.length; n += 1) {
      r[r.length] = t(e[n]);
    }
    return r;
  }
  return t(e);
}
module.exports = {
  arrayToObject: g,
  assign: v,
  combine: k,
  compact: w,
  decode: y,
  encode: b,
  isBuffer: E,
  isOverflow: l,
  isRegExp: x,
  markOverflow: u,
  maybeMap: S,
  merge: m
};
};
