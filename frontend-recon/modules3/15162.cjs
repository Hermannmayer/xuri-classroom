// webpack module 15162 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./14389.js").default;
var i = require("./49277.js").default;
var o = require("./83971.js").default;
var a = require("./72408.js").default;
var s = require("./10645.js");
var u = require("./54525.js");
var l = require("./24269.js");
var c = require("./1469.js");
function p(e) {
  return e === null || e === undefined;
}
var d = Symbol("encodeFragmentIdentifier");
function f(e) {
  switch (e.arrayFormat) {
    case "index":
      return function (t) {
        return function (r, n) {
          var i = r.length;
          if (n === undefined || e.skipNull && n === null || e.skipEmptyString && n === "") {
            return r;
          } else {
            return [].concat(a(r), n === null ? [[v(t, e), "[", i, "]"].join("")] : [[v(t, e), "[", v(i, e), "]=", v(n, e)].join("")]);
          }
        };
      };
    case "bracket":
      return function (t) {
        return function (r, n) {
          if (n === undefined || e.skipNull && n === null || e.skipEmptyString && n === "") {
            return r;
          } else {
            return [].concat(a(r), n === null ? [[v(t, e), "[]"].join("")] : [[v(t, e), "[]=", v(n, e)].join("")]);
          }
        };
      };
    case "colon-list-separator":
      return function (t) {
        return function (r, n) {
          if (n === undefined || e.skipNull && n === null || e.skipEmptyString && n === "") {
            return r;
          } else {
            return [].concat(a(r), n === null ? [[v(t, e), ":list="].join("")] : [[v(t, e), ":list=", v(n, e)].join("")]);
          }
        };
      };
    case "comma":
    case "separator":
    case "bracket-separator":
      var t = e.arrayFormat === "bracket-separator" ? "[]=" : "=";
      return function (r) {
        return function (n, i) {
          if (i === undefined || e.skipNull && i === null || e.skipEmptyString && i === "") {
            return n;
          } else {
            i = i === null ? "" : i;
            if (n.length === 0) {
              return [[v(r, e), t, v(i, e)].join("")];
            } else {
              return [[n, v(i, e)].join(e.arrayFormatSeparator)];
            }
          }
        };
      };
    default:
      return function (t) {
        return function (r, n) {
          if (n === undefined || e.skipNull && n === null || e.skipEmptyString && n === "") {
            return r;
          } else {
            return [].concat(a(r), n === null ? [v(t, e)] : [[v(t, e), "=", v(n, e)].join("")]);
          }
        };
      };
  }
}
function g(e) {
  var t;
  switch (e.arrayFormat) {
    case "index":
      return function (e, r, n) {
        t = /\[(\d*)\]$/.exec(e);
        e = e.replace(/\[\d*\]$/, "");
        if (t) {
          if (n[e] === undefined) {
            n[e] = {};
          }
          n[e][t[1]] = r;
        } else {
          n[e] = r;
        }
      };
    case "bracket":
      return function (e, r, n) {
        t = /(\[\])$/.exec(e);
        e = e.replace(/\[\]$/, "");
        if (t) {
          if (n[e] !== undefined) {
            n[e] = [].concat(n[e], r);
          } else {
            n[e] = [r];
          }
        } else {
          n[e] = r;
        }
      };
    case "colon-list-separator":
      return function (e, r, n) {
        t = /(:list)$/.exec(e);
        e = e.replace(/:list$/, "");
        if (t) {
          if (n[e] !== undefined) {
            n[e] = [].concat(n[e], r);
          } else {
            n[e] = [r];
          }
        } else {
          n[e] = r;
        }
      };
    case "comma":
    case "separator":
      return function (t, r, n) {
        var i = typeof r === "string" && r.includes(e.arrayFormatSeparator);
        var o = typeof r === "string" && !i && y(r, e).includes(e.arrayFormatSeparator);
        r = o ? y(r, e) : r;
        var a = i || o ? r.split(e.arrayFormatSeparator).map(function (t) {
          return y(t, e);
        }) : r === null ? r : y(r, e);
        n[t] = a;
      };
    case "bracket-separator":
      return function (t, r, n) {
        var i = /(\[\])$/.test(t);
        t = t.replace(/\[\]$/, "");
        if (i) {
          var o = r === null ? [] : r.split(e.arrayFormatSeparator).map(function (t) {
            return y(t, e);
          });
          if (n[t] !== undefined) {
            n[t] = [].concat(n[t], o);
          } else {
            n[t] = o;
          }
        } else {
          n[t] = r ? y(r, e) : r;
        }
      };
    default:
      return function (e, t, r) {
        if (r[e] !== undefined) {
          r[e] = [].concat(r[e], t);
        } else {
          r[e] = t;
        }
      };
  }
}
function m(e) {
  if (typeof e !== "string" || e.length !== 1) {
    throw new TypeError("arrayFormatSeparator must be single character string");
  }
}
function v(e, t) {
  if (t.encode) {
    if (t.strict) {
      return s(e);
    } else {
      return encodeURIComponent(e);
    }
  } else {
    return e;
  }
}
function y(e, t) {
  if (t.decode) {
    return u(e);
  } else {
    return e;
  }
}
function h(e) {
  if (Array.isArray(e)) {
    return e.sort();
  } else if (typeof e === "object") {
    return h(Object.keys(e)).sort(function (e, t) {
      return Number(e) - Number(t);
    }).map(function (t) {
      return e[t];
    });
  } else {
    return e;
  }
}
function b(e) {
  var t = e.indexOf("#");
  if (t !== -1) {
    e = e.slice(0, t);
  }
  return e;
}
function w(e) {
  var t = "";
  var r = e.indexOf("#");
  if (r !== -1) {
    t = e.slice(r);
  }
  return t;
}
function x(e) {
  e = b(e);
  var t = e.indexOf("?");
  if (t === -1) {
    return "";
  } else {
    return e.slice(t + 1);
  }
}
function E(e, t) {
  if (t.parseNumbers && !Number.isNaN(Number(e)) && typeof e === "string" && e.trim() !== "") {
    e = Number(e);
  } else if (!!t.parseBooleans && e !== null && (e.toLowerCase() === "true" || e.toLowerCase() === "false")) {
    e = e.toLowerCase() === "true";
  }
  return e;
}
function k(e, t) {
  t = Object.assign({
    decode: true,
    sort: true,
    arrayFormat: "none",
    arrayFormatSeparator: ",",
    parseNumbers: false,
    parseBooleans: false
  }, t);
  m(t.arrayFormatSeparator);
  var r = g(t);
  var n = Object.create(null);
  if (typeof e !== "string") {
    return n;
  }
  e = e.trim().replace(/^[?#&]/, "");
  if (!e) {
    return n;
  }
  var a;
  var s = o(e.split("&"));
  try {
    for (s.s(); !(a = s.n()).done;) {
      var u = a.value;
      if (u !== "") {
        var c = l(t.decode ? u.replace(/\+/g, " ") : u, "=");
        var p = i(c, 2);
        var d = p[0];
        var f = p[1];
        f = f === undefined ? null : ["comma", "separator", "bracket-separator"].includes(t.arrayFormat) ? f : y(f, t);
        r(y(d, t), f, n);
      }
    }
  } catch (C) {
    s.e(C);
  } finally {
    s.f();
  }
  for (var v = 0, b = Object.keys(n); v < b.length; v++) {
    var w = b[v];
    var x = n[w];
    if (typeof x === "object" && x !== null) {
      for (var k = 0, S = Object.keys(x); k < S.length; k++) {
        var T = S[k];
        x[T] = E(x[T], t);
      }
    } else {
      n[w] = E(x, t);
    }
  }
  if (t.sort === false) {
    return n;
  } else {
    return (t.sort === true ? Object.keys(n).sort() : Object.keys(n).sort(t.sort)).reduce(function (e, t) {
      var r = n[t];
      if (Boolean(r) && typeof r === "object" && !Array.isArray(r)) {
        e[t] = h(r);
      } else {
        e[t] = r;
      }
      return e;
    }, Object.create(null));
  }
}
exports.extract = x;
exports.parse = k;
exports.stringify = function (e, t) {
  if (!e) {
    return "";
  }
  t = Object.assign({
    encode: true,
    strict: true,
    arrayFormat: "none",
    arrayFormatSeparator: ","
  }, t);
  m(t.arrayFormatSeparator);
  var r = function (r) {
    return t.skipNull && p(e[r]) || t.skipEmptyString && e[r] === "";
  };
  var n = f(t);
  var i = {};
  for (var o = 0, a = Object.keys(e); o < a.length; o++) {
    var s = a[o];
    if (!r(s)) {
      i[s] = e[s];
    }
  }
  var u = Object.keys(i);
  if (t.sort !== false) {
    u.sort(t.sort);
  }
  return u.map(function (r) {
    var i = e[r];
    if (i === undefined) {
      return "";
    } else if (i === null) {
      return v(r, t);
    } else if (Array.isArray(i)) {
      if (i.length === 0 && t.arrayFormat === "bracket-separator") {
        return v(r, t) + "[]";
      } else {
        return i.reduce(n(r), []).join("&");
      }
    } else {
      return v(r, t) + "=" + v(i, t);
    }
  }).filter(function (e) {
    return e.length > 0;
  }).join("&");
};
exports.parseUrl = function (e, t) {
  t = Object.assign({
    decode: true
  }, t);
  var r = l(e, "#");
  var n = i(r, 2);
  var o = n[0];
  var a = n[1];
  return Object.assign({
    url: o.split("?")[0] || "",
    query: k(x(e), t)
  }, t && t.parseFragmentIdentifier && a ? {
    fragmentIdentifier: y(a, t)
  } : {});
};
exports.stringifyUrl = function (e, r) {
  r = Object.assign(n({
    encode: true,
    strict: true
  }, d, true), r);
  var i = b(e.url).split("?")[0] || "";
  var o = exports.extract(e.url);
  var a = exports.parse(o, {
    sort: false
  });
  var s = Object.assign(a, e.query);
  var u = exports.stringify(s, r);
  u &&= `?${u}`;
  var l = w(e.url);
  if (e.fragmentIdentifier) {
    l = `#${r[d] ? v(e.fragmentIdentifier, r) : e.fragmentIdentifier}`;
  }
  return `${i}${u}${l}`;
};
exports.pick = function (e, r, i) {
  i = Object.assign(n({
    parseFragmentIdentifier: true
  }, d, false), i);
  var o = exports.parseUrl(e, i);
  var a = o.url;
  var s = o.query;
  var u = o.fragmentIdentifier;
  return exports.stringifyUrl({
    url: a,
    query: c(s, r),
    fragmentIdentifier: u
  }, i);
};
exports.exclude = function (e, r, n) {
  var i = Array.isArray(r) ? function (e) {
    return !r.includes(e);
  } : function (e, t) {
    return !r(e, t);
  };
  return exports.pick(e, i, n);
};
};
