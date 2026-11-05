// webpack module 86281 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = v;
module.exports.match = a;
module.exports.regexpToFunction = s;
module.exports.parse = n;
module.exports.compile = o;
module.exports.tokensToFunction = u;
module.exports.tokensToRegExp = m;
var t = "/";
var r = new RegExp(["(\\\\.)", "(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?"].join("|"), "g");
function n(e, n) {
  var o;
  var a = [];
  var s = 0;
  var u = 0;
  var l = "";
  var p = n && n.delimiter || t;
  var d = n && n.whitelist || undefined;
  var f = false;
  while ((o = r.exec(e)) !== null) {
    var g = o[0];
    var m = o[1];
    var v = o.index;
    l += e.slice(u, v);
    u = v + g.length;
    if (m) {
      l += m[1];
      f = true;
    } else {
      var y = "";
      var h = o[2];
      var b = o[3];
      var w = o[4];
      var x = o[5];
      if (!f && l.length) {
        var E = l.length - 1;
        var k = l[E];
        var S = !d || d.indexOf(k) > -1;
        if (S) {
          y = k;
          l = l.slice(0, E);
        }
      }
      if (l) {
        a.push(l);
        l = "";
        f = false;
      }
      var T = x === "+" || x === "*";
      var C = x === "?" || x === "*";
      var A = b || w;
      var _ = y || p;
      var O = y || (typeof a[a.length - 1] === "string" ? a[a.length - 1] : "");
      a.push({
        name: h || s++,
        prefix: y,
        delimiter: _,
        optional: C,
        repeat: T,
        pattern: A ? c(A) : i(_, p, O)
      });
    }
  }
  if (l || u < e.length) {
    a.push(l + e.substr(u));
  }
  return a;
}
function i(e, t, r) {
  var n = "[^" + l(e === t ? e : e + t) + "]";
  if (!r || r.indexOf(e) > -1 || r.indexOf(t) > -1) {
    return n + "+?";
  } else {
    return l(r) + "|(?:(?!" + l(r) + ")" + n + ")+?";
  }
}
function o(e, t) {
  return u(n(e, t), t);
}
function a(e, t) {
  var r = [];
  var n = v(e, r, t);
  return s(n, r);
}
function s(e, t) {
  return function (r, n) {
    var i = e.exec(r);
    if (!i) {
      return false;
    }
    var o = i[0];
    var a = i.index;
    var s = {};
    var u = n && n.decode || decodeURIComponent;
    for (var l = 1; l < i.length; l++) {
      if (i[l] !== undefined) {
        var c = t[l - 1];
        if (c.repeat) {
          s[c.name] = i[l].split(c.delimiter).map(function (e) {
            return u(e, c);
          });
        } else {
          s[c.name] = u(i[l], c);
        }
      }
    }
    return {
      path: o,
      index: a,
      params: s
    };
  };
}
function u(e, t) {
  var r = new Array(e.length);
  for (var n = 0; n < e.length; n++) {
    if (typeof e[n] === "object") {
      r[n] = new RegExp("^(?:" + e[n].pattern + ")$", p(t));
    }
  }
  return function (t, n) {
    var i = "";
    var o = n && n.encode || encodeURIComponent;
    var a = !n || n.validate !== false;
    for (var s = 0; s < e.length; s++) {
      var u = e[s];
      if (typeof u !== "string") {
        var l;
        var c = t ? t[u.name] : undefined;
        if (Array.isArray(c)) {
          if (!u.repeat) {
            throw new TypeError("Expected \"" + u.name + "\" to not repeat, but got array");
          }
          if (c.length === 0) {
            if (u.optional) {
              continue;
            }
            throw new TypeError("Expected \"" + u.name + "\" to not be empty");
          }
          for (var p = 0; p < c.length; p++) {
            l = o(c[p], u);
            if (a && !r[s].test(l)) {
              throw new TypeError("Expected all \"" + u.name + "\" to match \"" + u.pattern + "\"");
            }
            i += (p === 0 ? u.prefix : u.delimiter) + l;
          }
        } else if (typeof c !== "string" && typeof c !== "number" && typeof c !== "boolean") {
          if (!u.optional) {
            throw new TypeError("Expected \"" + u.name + "\" to be " + (u.repeat ? "an array" : "a string"));
          }
        } else {
          l = o(String(c), u);
          if (a && !r[s].test(l)) {
            throw new TypeError("Expected \"" + u.name + "\" to match \"" + u.pattern + "\", but got \"" + l + "\"");
          }
          i += u.prefix + l;
        }
      } else {
        i += u;
      }
    }
    return i;
  };
}
function l(e) {
  return e.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function c(e) {
  return e.replace(/([=!:$/()])/g, "\\$1");
}
function p(e) {
  if (e && e.sensitive) {
    return "";
  } else {
    return "i";
  }
}
function d(e, t) {
  if (!t) {
    return e;
  }
  var r = e.source.match(/\((?!\?)/g);
  if (r) {
    for (var n = 0; n < r.length; n++) {
      t.push({
        name: n,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        pattern: null
      });
    }
  }
  return e;
}
function f(e, t, r) {
  var n = [];
  for (var i = 0; i < e.length; i++) {
    n.push(v(e[i], t, r).source);
  }
  return new RegExp("(?:" + n.join("|") + ")", p(r));
}
function g(e, t, r) {
  return m(n(e, r), t, r);
}
function m(e, r, n) {
  n = n || {};
  var i = n.strict;
  var o = n.start !== false;
  var a = n.end !== false;
  var s = n.delimiter || t;
  var u = [].concat(n.endsWith || []).map(l).concat("$").join("|");
  var c = o ? "^" : "";
  for (var d = 0; d < e.length; d++) {
    var f = e[d];
    if (typeof f === "string") {
      c += l(f);
    } else {
      var g = f.repeat ? "(?:" + f.pattern + ")(?:" + l(f.delimiter) + "(?:" + f.pattern + "))*" : f.pattern;
      if (r) {
        r.push(f);
      }
      if (f.optional) {
        if (f.prefix) {
          c += "(?:" + l(f.prefix) + "(" + g + "))?";
        } else {
          c += "(" + g + ")?";
        }
      } else {
        c += l(f.prefix) + "(" + g + ")";
      }
    }
  }
  if (a) {
    if (!i) {
      c += "(?:" + l(s) + ")?";
    }
    c += u === "$" ? "$" : "(?=" + u + ")";
  } else {
    var m = e[e.length - 1];
    var v = typeof m === "string" ? m[m.length - 1] === s : m === undefined;
    if (!i) {
      c += "(?:" + l(s) + "(?=" + u + "))?";
    }
    if (!v) {
      c += "(?=" + l(s) + "|" + u + ")";
    }
  }
  return new RegExp(c, p(n));
}
function v(e, t, r) {
  if (e instanceof RegExp) {
    return d(e, t);
  } else if (Array.isArray(e)) {
    return f(e, t, r);
  } else {
    return g(e, t, r);
  }
}
};
