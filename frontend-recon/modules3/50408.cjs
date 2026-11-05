// webpack module 50408 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./9669.js");
var i = Object.prototype.hasOwnProperty;
var o = Array.isArray;
var a = {
  allowDots: false,
  allowEmptyArrays: false,
  allowPrototypes: false,
  allowSparse: false,
  arrayLimit: 20,
  charset: "utf-8",
  charsetSentinel: false,
  comma: false,
  decodeDotInKeys: false,
  decoder: n.decode,
  delimiter: "&",
  depth: 5,
  duplicates: "combine",
  ignoreQueryPrefix: false,
  interpretNumericEntities: false,
  parameterLimit: 1000,
  parseArrays: true,
  plainObjects: false,
  strictDepth: false,
  strictMerge: true,
  strictNullHandling: false,
  throwOnLimitExceeded: false
};
function s(e) {
  return e.replace(/&#(\d+);/g, function (e, t) {
    return String.fromCharCode(parseInt(t, 10));
  });
}
function u(e, t, r) {
  if (e && typeof e === "string" && t.comma && e.indexOf(",") > -1) {
    return e.split(",");
  }
  if (t.throwOnLimitExceeded && r >= t.arrayLimit) {
    throw new RangeError("Array limit exceeded. Only " + t.arrayLimit + " element" + (t.arrayLimit === 1 ? "" : "s") + " allowed in an array.");
  }
  return e;
}
var l = "utf8=%26%2310003%3B";
var c = "utf8=%E2%9C%93";
function p(e, t) {
  var r = {
    __proto__: null
  };
  var p = t.ignoreQueryPrefix ? e.replace(/^\?/, "") : e;
  p = p.replace(/%5B/gi, "[").replace(/%5D/gi, "]");
  var d = t.parameterLimit === Infinity ? undefined : t.parameterLimit;
  var f = p.split(t.delimiter, t.throwOnLimitExceeded && typeof d !== "undefined" ? d + 1 : d);
  if (t.throwOnLimitExceeded && typeof d !== "undefined" && f.length > d) {
    throw new RangeError("Parameter limit exceeded. Only " + d + " parameter" + (d === 1 ? "" : "s") + " allowed.");
  }
  var g;
  var m = -1;
  var v = t.charset;
  if (t.charsetSentinel) {
    for (g = 0; g < f.length; ++g) {
      if (f[g].indexOf("utf8=") === 0) {
        if (f[g] === c) {
          v = "utf-8";
        } else if (f[g] === l) {
          v = "iso-8859-1";
        }
        m = g;
        g = f.length;
      }
    }
  }
  for (g = 0; g < f.length; ++g) {
    if (g !== m) {
      var y;
      var h;
      var b = f[g];
      var w = b.indexOf("]=");
      var x = w === -1 ? b.indexOf("=") : w + 1;
      if (x === -1) {
        y = t.decoder(b, a.decoder, v, "key");
        h = t.strictNullHandling ? null : "";
      } else {
        y = t.decoder(b.slice(0, x), a.decoder, v, "key");
        if (y !== null) {
          h = n.maybeMap(u(b.slice(x + 1), t, o(r[y]) ? r[y].length : 0), function (e) {
            return t.decoder(e, a.decoder, v, "value");
          });
        }
      }
      if (h && t.interpretNumericEntities && v === "iso-8859-1") {
        h = s(String(h));
      }
      if (b.indexOf("[]=") > -1) {
        h = o(h) ? [h] : h;
      }
      if (t.comma && o(h) && h.length > t.arrayLimit) {
        if (t.throwOnLimitExceeded) {
          throw new RangeError("Array limit exceeded. Only " + t.arrayLimit + " element" + (t.arrayLimit === 1 ? "" : "s") + " allowed in an array.");
        }
        h = n.combine([], h, t.arrayLimit, t.plainObjects);
      }
      if (y !== null) {
        var E = i.call(r, y);
        if (E && (t.duplicates === "combine" || b.indexOf("[]=") > -1)) {
          r[y] = n.combine(r[y], h, t.arrayLimit, t.plainObjects);
        } else if (!E || t.duplicates === "last") {
          r[y] = h;
        }
      }
    }
  }
  return r;
}
function d(e, t, r, i) {
  var o = 0;
  if (e.length > 0 && e[e.length - 1] === "[]") {
    var a = e.slice(0, -1).join("");
    o = Array.isArray(t) && t[a] ? t[a].length : 0;
  }
  var s = i ? t : u(t, r, o);
  for (var l = e.length - 1; l >= 0; --l) {
    var c;
    var p = e[l];
    if (p === "[]" && r.parseArrays) {
      c = n.isOverflow(s) ? s : r.allowEmptyArrays && (s === "" || r.strictNullHandling && s === null) ? [] : n.combine([], s, r.arrayLimit, r.plainObjects);
    } else {
      c = r.plainObjects ? {
        __proto__: null
      } : {};
      var d = p.charAt(0) === "[" && p.charAt(p.length - 1) === "]" ? p.slice(1, -1) : p;
      var f = r.decodeDotInKeys ? d.replace(/%2E/g, ".") : d;
      var g = parseInt(f, 10);
      var m = !isNaN(g) && p !== f && String(g) === f && g >= 0 && r.parseArrays;
      if (r.parseArrays || f !== "") {
        if (m && g < r.arrayLimit) {
          c = [];
          c[g] = s;
        } else {
          if (m && r.throwOnLimitExceeded) {
            throw new RangeError("Array limit exceeded. Only " + r.arrayLimit + " element" + (r.arrayLimit === 1 ? "" : "s") + " allowed in an array.");
          }
          if (m) {
            c[g] = s;
            n.markOverflow(c, g);
          } else if (f !== "__proto__") {
            c[f] = s;
          }
        }
      } else {
        c = {
          0: s
        };
      }
    }
    s = c;
  }
  return s;
}
function f(e, t) {
  var r = t.allowDots ? e.replace(/\.([^.[]+)/g, "[$1]") : e;
  if (t.depth <= 0) {
    if (!t.plainObjects && i.call(Object.prototype, r) && !t.allowPrototypes) {
      return;
    }
    return [r];
  }
  var n = [];
  var o = r.indexOf("[");
  var a = o >= 0 ? r.slice(0, o) : r;
  if (a) {
    if (!t.plainObjects && i.call(Object.prototype, a) && !t.allowPrototypes) {
      return;
    }
    n[n.length] = a;
  }
  var s = r.length;
  var u = o;
  var l = 0;
  while (u >= 0 && l < t.depth) {
    var c = 1;
    var p = u + 1;
    var d = -1;
    while (p < s && d < 0) {
      var f = r.charCodeAt(p);
      if (f === 91) {
        c += 1;
      } else if (f === 93) {
        c -= 1;
        if (c === 0) {
          d = p;
        }
      }
      p += 1;
    }
    if (d < 0) {
      n[n.length] = "[" + r.slice(u) + "]";
      return n;
    }
    var g = r.slice(u, d + 1);
    var m = g.slice(1, -1);
    if (!t.plainObjects && i.call(Object.prototype, m) && !t.allowPrototypes) {
      return;
    }
    n[n.length] = g;
    l += 1;
    u = r.indexOf("[", d + 1);
  }
  if (u >= 0) {
    if (t.strictDepth === true) {
      throw new RangeError("Input depth exceeded depth option of " + t.depth + " and strictDepth is true");
    }
    n[n.length] = "[" + r.slice(u) + "]";
  }
  return n;
}
function g(e, t, r, n) {
  if (e) {
    var i = f(e, r);
    if (i) {
      return d(i, t, r, n);
    }
  }
}
function m(e) {
  if (!e) {
    return a;
  }
  if (typeof e.allowEmptyArrays !== "undefined" && typeof e.allowEmptyArrays !== "boolean") {
    throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
  }
  if (typeof e.decodeDotInKeys !== "undefined" && typeof e.decodeDotInKeys !== "boolean") {
    throw new TypeError("`decodeDotInKeys` option can only be `true` or `false`, when provided");
  }
  if (e.decoder !== null && typeof e.decoder !== "undefined" && typeof e.decoder !== "function") {
    throw new TypeError("Decoder has to be a function.");
  }
  if (typeof e.charset !== "undefined" && e.charset !== "utf-8" && e.charset !== "iso-8859-1") {
    throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
  }
  if (typeof e.throwOnLimitExceeded !== "undefined" && typeof e.throwOnLimitExceeded !== "boolean") {
    throw new TypeError("`throwOnLimitExceeded` option must be a boolean");
  }
  var t = typeof e.charset === "undefined" ? a.charset : e.charset;
  var r = typeof e.duplicates === "undefined" ? a.duplicates : e.duplicates;
  if (r !== "combine" && r !== "first" && r !== "last") {
    throw new TypeError("The duplicates option must be either combine, first, or last");
  }
  var i = typeof e.allowDots === "undefined" ? e.decodeDotInKeys === true || a.allowDots : !!e.allowDots;
  return {
    allowDots: i,
    allowEmptyArrays: typeof e.allowEmptyArrays === "boolean" ? !!e.allowEmptyArrays : a.allowEmptyArrays,
    allowPrototypes: typeof e.allowPrototypes === "boolean" ? e.allowPrototypes : a.allowPrototypes,
    allowSparse: typeof e.allowSparse === "boolean" ? e.allowSparse : a.allowSparse,
    arrayLimit: typeof e.arrayLimit === "number" ? e.arrayLimit : a.arrayLimit,
    charset: t,
    charsetSentinel: typeof e.charsetSentinel === "boolean" ? e.charsetSentinel : a.charsetSentinel,
    comma: typeof e.comma === "boolean" ? e.comma : a.comma,
    decodeDotInKeys: typeof e.decodeDotInKeys === "boolean" ? e.decodeDotInKeys : a.decodeDotInKeys,
    decoder: typeof e.decoder === "function" ? e.decoder : a.decoder,
    delimiter: typeof e.delimiter === "string" || n.isRegExp(e.delimiter) ? e.delimiter : a.delimiter,
    depth: typeof e.depth === "number" || e.depth === false ? +e.depth : a.depth,
    duplicates: r,
    ignoreQueryPrefix: e.ignoreQueryPrefix === true,
    interpretNumericEntities: typeof e.interpretNumericEntities === "boolean" ? e.interpretNumericEntities : a.interpretNumericEntities,
    parameterLimit: typeof e.parameterLimit === "number" ? e.parameterLimit : a.parameterLimit,
    parseArrays: e.parseArrays !== false,
    plainObjects: typeof e.plainObjects === "boolean" ? e.plainObjects : a.plainObjects,
    strictDepth: typeof e.strictDepth === "boolean" ? !!e.strictDepth : a.strictDepth,
    strictMerge: typeof e.strictMerge === "boolean" ? !!e.strictMerge : a.strictMerge,
    strictNullHandling: typeof e.strictNullHandling === "boolean" ? e.strictNullHandling : a.strictNullHandling,
    throwOnLimitExceeded: typeof e.throwOnLimitExceeded === "boolean" && e.throwOnLimitExceeded
  };
}
module.exports = function (e, t) {
  var r = m(t);
  if (e === "" || e === null || typeof e === "undefined") {
    if (r.plainObjects) {
      return {
        __proto__: null
      };
    } else {
      return {};
    }
  }
  var i = typeof e === "string" ? p(e, r) : e;
  var o = r.plainObjects ? {
    __proto__: null
  } : {};
  for (var a = Object.keys(i), s = 0; s < a.length; ++s) {
    var u = a[s];
    var l = g(u, i[u], r, typeof e === "string");
    o = n.merge(o, l, r);
  }
  if (r.allowSparse === true) {
    return o;
  } else {
    return n.compact(o);
  }
};
};
