// webpack module 5873 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./49277.js").default;
var i = require("./83971.js").default;
var o = require("./72408.js").default;
var a = require("./10645.js");
var s = require("./54525.js");
var u = require("./24269.js");
var l = require("./1469.js");
function c(e) {
  return e === null || e === undefined;
}
function p(e) {
  switch (e.arrayFormat) {
    case "index":
      return function (t) {
        return function (r, n) {
          var i = r.length;
          if (n === undefined || e.skipNull && n === null || e.skipEmptyString && n === "") {
            return r;
          } else {
            return [].concat(o(r), n === null ? [[g(t, e), "[", i, "]"].join("")] : [[g(t, e), "[", g(i, e), "]=", g(n, e)].join("")]);
          }
        };
      };
    case "bracket":
      return function (t) {
        return function (r, n) {
          if (n === undefined || e.skipNull && n === null || e.skipEmptyString && n === "") {
            return r;
          } else {
            return [].concat(o(r), n === null ? [[g(t, e), "[]"].join("")] : [[g(t, e), "[]=", g(n, e)].join("")]);
          }
        };
      };
    case "comma":
    case "separator":
      return function (t) {
        return function (r, n) {
          if (n === null || n === undefined || n.length === 0) {
            return r;
          } else if (r.length === 0) {
            return [[g(t, e), "=", g(n, e)].join("")];
          } else {
            return [[r, g(n, e)].join(e.arrayFormatSeparator)];
          }
        };
      };
    default:
      return function (t) {
        return function (r, n) {
          if (n === undefined || e.skipNull && n === null || e.skipEmptyString && n === "") {
            return r;
          } else {
            return [].concat(o(r), n === null ? [g(t, e)] : [[g(t, e), "=", g(n, e)].join("")]);
          }
        };
      };
  }
}
function d(e) {
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
    case "comma":
    case "separator":
      return function (t, r, n) {
        var i = typeof r === "string" && r.includes(e.arrayFormatSeparator);
        var o = typeof r === "string" && !i && m(r, e).includes(e.arrayFormatSeparator);
        r = o ? m(r, e) : r;
        var a = i || o ? r.split(e.arrayFormatSeparator).map(function (t) {
          return m(t, e);
        }) : r === null ? r : m(r, e);
        n[t] = a;
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
function f(e) {
  if (typeof e !== "string" || e.length !== 1) {
    throw new TypeError("arrayFormatSeparator must be single character string");
  }
}
function g(e, t) {
  if (t.encode) {
    if (t.strict) {
      return a(e);
    } else {
      return encodeURIComponent(e);
    }
  } else {
    return e;
  }
}
function m(e, t) {
  if (t.decode) {
    return s(e);
  } else {
    return e;
  }
}
function v(e) {
  if (Array.isArray(e)) {
    return e.sort();
  } else if (typeof e === "object") {
    return v(Object.keys(e)).sort(function (e, t) {
      return Number(e) - Number(t);
    }).map(function (t) {
      return e[t];
    });
  } else {
    return e;
  }
}
function y(e) {
  var t = e.indexOf("#");
  if (t !== -1) {
    e = e.slice(0, t);
  }
  return e;
}
function h(e) {
  var t = "";
  var r = e.indexOf("#");
  if (r !== -1) {
    t = e.slice(r);
  }
  return t;
}
function b(e) {
  e = y(e);
  var t = e.indexOf("?");
  if (t === -1) {
    return "";
  } else {
    return e.slice(t + 1);
  }
}
function w(e, t) {
  if (t.parseNumbers && !Number.isNaN(Number(e)) && typeof e === "string" && e.trim() !== "") {
    e = Number(e);
  } else if (!!t.parseBooleans && e !== null && (e.toLowerCase() === "true" || e.toLowerCase() === "false")) {
    e = e.toLowerCase() === "true";
  }
  return e;
}
function x(e, t) {
  t = Object.assign({
    decode: true,
    sort: true,
    arrayFormat: "none",
    arrayFormatSeparator: ",",
    parseNumbers: false,
    parseBooleans: false
  }, t);
  f(t.arrayFormatSeparator);
  var r = d(t);
  var o = Object.create(null);
  if (typeof e !== "string") {
    return o;
  }
  e = e.trim().replace(/^[?#&]/, "");
  if (!e) {
    return o;
  }
  var a;
  var s = i(e.split("&"));
  try {
    for (s.s(); !(a = s.n()).done;) {
      var l = a.value;
      if (l !== "") {
        var c = u(t.decode ? l.replace(/\+/g, " ") : l, "=");
        var p = n(c, 2);
        var g = p[0];
        var y = p[1];
        y = y === undefined ? null : ["comma", "separator"].includes(t.arrayFormat) ? y : m(y, t);
        r(m(g, t), y, o);
      }
    }
  } catch (C) {
    s.e(C);
  } finally {
    s.f();
  }
  for (var h = 0, b = Object.keys(o); h < b.length; h++) {
    var x = b[h];
    var E = o[x];
    if (typeof E === "object" && E !== null) {
      for (var k = 0, S = Object.keys(E); k < S.length; k++) {
        var T = S[k];
        E[T] = w(E[T], t);
      }
    } else {
      o[x] = w(E, t);
    }
  }
  if (t.sort === false) {
    return o;
  } else {
    return (t.sort === true ? Object.keys(o).sort() : Object.keys(o).sort(t.sort)).reduce(function (e, t) {
      var r = o[t];
      if (Boolean(r) && typeof r === "object" && !Array.isArray(r)) {
        e[t] = v(r);
      } else {
        e[t] = r;
      }
      return e;
    }, Object.create(null));
  }
}
exports.extract = b;
exports.parse = x;
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
  f(t.arrayFormatSeparator);
  var r = function (r) {
    return t.skipNull && c(e[r]) || t.skipEmptyString && e[r] === "";
  };
  var n = p(t);
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
      return g(r, t);
    } else if (Array.isArray(i)) {
      return i.reduce(n(r), []).join("&");
    } else {
      return g(r, t) + "=" + g(i, t);
    }
  }).filter(function (e) {
    return e.length > 0;
  }).join("&");
};
exports.parseUrl = function (e, t) {
  t = Object.assign({
    decode: true
  }, t);
  var r = u(e, "#");
  var i = n(r, 2);
  var o = i[0];
  var a = i[1];
  return Object.assign({
    url: o.split("?")[0] || "",
    query: x(b(e), t)
  }, t && t.parseFragmentIdentifier && a ? {
    fragmentIdentifier: m(a, t)
  } : {});
};
exports.stringifyUrl = function (e, r) {
  r = Object.assign({
    encode: true,
    strict: true
  }, r);
  var n = y(e.url).split("?")[0] || "";
  var i = exports.extract(e.url);
  var o = exports.parse(i, {
    sort: false
  });
  var a = Object.assign(o, e.query);
  var s = exports.stringify(a, r);
  s &&= `?${s}`;
  var u = h(e.url);
  if (e.fragmentIdentifier) {
    u = `#${g(e.fragmentIdentifier, r)}`;
  }
  return `${n}${s}${u}`;
};
exports.pick = function (e, r, n) {
  n = Object.assign({
    parseFragmentIdentifier: true
  }, n);
  var i = exports.parseUrl(e, n);
  var o = i.url;
  var a = i.query;
  var s = i.fragmentIdentifier;
  return exports.stringifyUrl({
    url: o,
    query: l(a, r),
    fragmentIdentifier: s
  }, n);
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
