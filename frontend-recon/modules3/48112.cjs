// webpack module 48112 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60316.js");
var i = require("./9669.js");
var o = require("./90889.js");
var a = Object.prototype.hasOwnProperty;
var s = {
  brackets: function (e) {
    return e + "[]";
  },
  comma: "comma",
  indices: function (e, t) {
    return e + "[" + t + "]";
  },
  repeat: function (e) {
    return e;
  }
};
var u = Array.isArray;
var l = Array.prototype.push;
function c(e, t) {
  l.apply(e, u(t) ? t : [t]);
}
var p = Date.prototype.toISOString;
var d = o.default;
var f = {
  addQueryPrefix: false,
  allowDots: false,
  allowEmptyArrays: false,
  arrayFormat: "indices",
  charset: "utf-8",
  charsetSentinel: false,
  commaRoundTrip: false,
  delimiter: "&",
  encode: true,
  encodeDotInKeys: false,
  encoder: i.encode,
  encodeValuesOnly: false,
  filter: undefined,
  format: d,
  formatter: o.formatters[d],
  indices: false,
  serializeDate: function (e) {
    return p.call(e);
  },
  skipNulls: false,
  strictNullHandling: false
};
function g(e) {
  return typeof e === "string" || typeof e === "number" || typeof e === "boolean" || typeof e === "symbol" || typeof e === "bigint";
}
var m = {};
var v = function e(t, r, o, a, s, l, p, d, v, y, h, b, w, x, E, k, S, T) {
  var C = t;
  var A = T;
  var _ = 0;
  var O = false;
  while ((A = A.get(m)) !== undefined && !O) {
    var M = A.get(t);
    _ += 1;
    if (typeof M !== "undefined") {
      if (M === _) {
        throw new RangeError("Cyclic object value");
      }
      O = true;
    }
    if (typeof A.get(m) === "undefined") {
      _ = 0;
    }
  }
  if (typeof y === "function") {
    C = y(r, C);
  } else if (C instanceof Date) {
    C = w(C);
  } else if (o === "comma" && u(C)) {
    C = i.maybeMap(C, function (e) {
      if (e instanceof Date) {
        return w(e);
      } else {
        return e;
      }
    });
  }
  if (C === null) {
    if (l) {
      return E(v && !k ? v(r, f.encoder, S, "key", x) : r);
    }
    C = "";
  }
  if (g(C) || i.isBuffer(C)) {
    if (v) {
      var P = k ? r : v(r, f.encoder, S, "key", x);
      return [E(P) + "=" + E(v(C, f.encoder, S, "value", x))];
    }
    return [E(r) + "=" + E(String(C))];
  }
  var q;
  var N = [];
  if (typeof C === "undefined") {
    return N;
  }
  if (o === "comma" && u(C)) {
    if (k && v) {
      C = i.maybeMap(C, function (e) {
        if (e == null) {
          return e;
        } else {
          return v(e);
        }
      });
    }
    q = [{
      value: C.length > 0 ? C.join(",") || null : undefined
    }];
  } else if (u(y)) {
    q = y;
  } else {
    var R = Object.keys(C);
    q = h ? R.sort(h) : R;
  }
  var I = d ? String(r).replace(/\./g, "%2E") : String(r);
  var j = a && u(C) && C.length === 1 ? I + "[]" : I;
  if (s && u(C) && C.length === 0) {
    return j + "[]";
  }
  for (var D = 0; D < q.length; ++D) {
    var L = q[D];
    var F = typeof L === "object" && L && typeof L.value !== "undefined" ? L.value : C[L];
    if (!p || F !== null) {
      var Z = b && d ? String(L).replace(/\./g, "%2E") : String(L);
      var z = u(C) ? typeof o === "function" ? o(j, Z) : j : j + (b ? "." + Z : "[" + Z + "]");
      T.set(t, _);
      var U = n();
      U.set(m, T);
      c(N, e(F, z, o, a, s, l, p, d, o === "comma" && k && u(C) ? null : v, y, h, b, w, x, E, k, S, U));
    }
  }
  return N;
};
function y(e) {
  if (!e) {
    return f;
  }
  if (typeof e.allowEmptyArrays !== "undefined" && typeof e.allowEmptyArrays !== "boolean") {
    throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
  }
  if (typeof e.encodeDotInKeys !== "undefined" && typeof e.encodeDotInKeys !== "boolean") {
    throw new TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
  }
  if (e.encoder !== null && typeof e.encoder !== "undefined" && typeof e.encoder !== "function") {
    throw new TypeError("Encoder has to be a function.");
  }
  var t = e.charset || f.charset;
  if (typeof e.charset !== "undefined" && e.charset !== "utf-8" && e.charset !== "iso-8859-1") {
    throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
  }
  var r = o.default;
  if (typeof e.format !== "undefined") {
    if (!a.call(o.formatters, e.format)) {
      throw new TypeError("Unknown format option provided.");
    }
    r = e.format;
  }
  var n;
  var i = o.formatters[r];
  var l = f.filter;
  if (typeof e.filter === "function" || u(e.filter)) {
    l = e.filter;
  }
  n = e.arrayFormat in s ? e.arrayFormat : "indices" in e ? e.indices ? "indices" : "repeat" : f.arrayFormat;
  if ("commaRoundTrip" in e && typeof e.commaRoundTrip !== "boolean") {
    throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
  }
  var c = typeof e.allowDots === "undefined" ? e.encodeDotInKeys === true || f.allowDots : !!e.allowDots;
  return {
    addQueryPrefix: typeof e.addQueryPrefix === "boolean" ? e.addQueryPrefix : f.addQueryPrefix,
    allowDots: c,
    allowEmptyArrays: typeof e.allowEmptyArrays === "boolean" ? !!e.allowEmptyArrays : f.allowEmptyArrays,
    arrayFormat: n,
    charset: t,
    charsetSentinel: typeof e.charsetSentinel === "boolean" ? e.charsetSentinel : f.charsetSentinel,
    commaRoundTrip: !!e.commaRoundTrip,
    delimiter: typeof e.delimiter === "undefined" ? f.delimiter : e.delimiter,
    encode: typeof e.encode === "boolean" ? e.encode : f.encode,
    encodeDotInKeys: typeof e.encodeDotInKeys === "boolean" ? e.encodeDotInKeys : f.encodeDotInKeys,
    encoder: typeof e.encoder === "function" ? e.encoder : f.encoder,
    encodeValuesOnly: typeof e.encodeValuesOnly === "boolean" ? e.encodeValuesOnly : f.encodeValuesOnly,
    filter: l,
    format: r,
    formatter: i,
    serializeDate: typeof e.serializeDate === "function" ? e.serializeDate : f.serializeDate,
    skipNulls: typeof e.skipNulls === "boolean" ? e.skipNulls : f.skipNulls,
    sort: typeof e.sort === "function" ? e.sort : null,
    strictNullHandling: typeof e.strictNullHandling === "boolean" ? e.strictNullHandling : f.strictNullHandling
  };
}
module.exports = function (e, t) {
  var r;
  var i;
  var o = e;
  var a = y(t);
  if (typeof a.filter === "function") {
    i = a.filter;
    o = i("", o);
  } else if (u(a.filter)) {
    i = a.filter;
    r = i;
  }
  var l = [];
  if (typeof o !== "object" || o === null) {
    return "";
  }
  var p = s[a.arrayFormat];
  var d = p === "comma" && a.commaRoundTrip;
  r ||= Object.keys(o);
  if (a.sort) {
    r.sort(a.sort);
  }
  var f = n();
  for (var g = 0; g < r.length; ++g) {
    var m = r[g];
    if (typeof m !== "undefined" && m !== null) {
      var h = o[m];
      if (!a.skipNulls || h !== null) {
        c(l, v(h, m, p, d, a.allowEmptyArrays, a.strictNullHandling, a.skipNulls, a.encodeDotInKeys, a.encode ? a.encoder : null, a.filter, a.sort, a.allowDots, a.serializeDate, a.format, a.formatter, a.encodeValuesOnly, a.charset, f));
      }
    }
  }
  var b = l.join(a.delimiter);
  var w = a.addQueryPrefix === true ? "?" : "";
  if (a.charsetSentinel) {
    if (a.charset === "iso-8859-1") {
      w += "utf8=%26%2310003%3B" + a.delimiter;
    } else {
      w += "utf8=%E2%9C%93" + a.delimiter;
    }
  }
  if (b.length > 0) {
    return w + b;
  } else {
    return "";
  }
};
};
