// webpack module 63325 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return ne;
  }
});
require("./14224.js");
function n() {
  n = Object.assign ? Object.assign.bind() : function (e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r) {
        if (Object.prototype.hasOwnProperty.call(r, n)) {
          e[n] = r[n];
        }
      }
    }
    return e;
  };
  return n.apply(this, arguments);
}
function i(e, t) {
  e.prototype = Object.create(t.prototype);
  e.prototype.constructor = e;
  a(e, t);
}
function o(e) {
  o = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (e) {
    return e.__proto__ || Object.getPrototypeOf(e);
  };
  return o(e);
}
function a(e, t) {
  a = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (e, t) {
    e.__proto__ = t;
    return e;
  };
  return a(e, t);
}
function s() {
  if (typeof Reflect === "undefined" || !Reflect.construct) {
    return false;
  }
  if (Reflect.construct.sham) {
    return false;
  }
  if (typeof Proxy === "function") {
    return true;
  }
  try {
    Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}
function u(e, t, r) {
  u = s() ? Reflect.construct.bind() : function (e, t, r) {
    var n = [null];
    n.push.apply(n, t);
    var i = Function.bind.apply(e, n);
    var o = new i();
    if (r) {
      a(o, r.prototype);
    }
    return o;
  };
  return u.apply(null, arguments);
}
function l(e) {
  return Function.toString.call(e).indexOf("[native code]") !== -1;
}
function c(e) {
  var t = typeof Map === "function" ? new Map() : undefined;
  c = function (e) {
    if (e === null || !l(e)) {
      return e;
    }
    if (typeof e !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }
    if (typeof t !== "undefined") {
      if (t.has(e)) {
        return t.get(e);
      }
      t.set(e, r);
    }
    function r() {
      return u(e, arguments, o(this).constructor);
    }
    r.prototype = Object.create(e.prototype, {
      constructor: {
        value: r,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    return a(r, e);
  };
  return c(e);
}
var p = /%[sdj%]/g;
function d() {}
function f(e) {
  if (!e || !e.length) {
    return null;
  }
  var t = {};
  e.forEach(function (e) {
    var r = e.field;
    t[r] = t[r] || [];
    t[r].push(e);
  });
  return t;
}
function g(e) {
  for (var t = arguments.length, r = new Array(t > 1 ? t - 1 : 0), n = 1; n < t; n++) {
    r[n - 1] = arguments[n];
  }
  var i = 0;
  var o = r.length;
  if (typeof e === "function") {
    return e.apply(null, r);
  }
  if (typeof e === "string") {
    var a = e.replace(p, function (e) {
      if (e === "%%") {
        return "%";
      }
      if (i >= o) {
        return e;
      }
      switch (e) {
        case "%s":
          return String(r[i++]);
        case "%d":
          return Number(r[i++]);
        case "%j":
          try {
            return JSON.stringify(r[i++]);
          } catch (t) {
            return "[Circular]";
          }
          break;
        default:
          return e;
      }
    });
    return a;
  }
  return e;
}
function m(e) {
  return e === "string" || e === "url" || e === "hex" || e === "email" || e === "date" || e === "pattern";
}
function v(e, t) {
  return e === undefined || e === null || t === "array" && !!Array.isArray(e) && !e.length || !!m(t) && typeof e === "string" && !e;
}
function y(e, t, r) {
  var n = [];
  var i = 0;
  var o = e.length;
  function a(e) {
    n.push.apply(n, e || []);
    i++;
    if (i === o) {
      r(n);
    }
  }
  e.forEach(function (e) {
    t(e, a);
  });
}
function h(e, t, r) {
  var n = 0;
  var i = e.length;
  function o(a) {
    if (a && a.length) {
      r(a);
    } else {
      var s = n;
      n += 1;
      if (s < i) {
        t(e[s], o);
      } else {
        r([]);
      }
    }
  }
  o([]);
}
function b(e) {
  var t = [];
  Object.keys(e).forEach(function (r) {
    t.push.apply(t, e[r] || []);
  });
  return t;
}
var w = function (e) {
  function t(t, r) {
    var n;
    n = e.call(this, "Async Validation Error") || this;
    n.errors = t;
    n.fields = r;
    return n;
  }
  i(t, e);
  return t;
}(c(Error));
function x(e, t, r, n, i) {
  if (t.first) {
    var o = new Promise(function (t, o) {
      function a(e) {
        n(e);
        if (e.length) {
          return o(new w(e, f(e)));
        } else {
          return t(i);
        }
      }
      var s = b(e);
      h(s, r, a);
    });
    o.catch(function (e) {
      return e;
    });
    return o;
  }
  var a = t.firstFields === true ? Object.keys(e) : t.firstFields || [];
  var s = Object.keys(e);
  var u = s.length;
  var l = 0;
  var c = [];
  var p = new Promise(function (t, o) {
    function p(e) {
      c.push.apply(c, e);
      l++;
      if (l === u) {
        n(c);
        if (c.length) {
          return o(new w(c, f(c)));
        } else {
          return t(i);
        }
      }
    }
    if (!s.length) {
      n(c);
      t(i);
    }
    s.forEach(function (t) {
      var n = e[t];
      if (a.indexOf(t) !== -1) {
        h(n, r, p);
      } else {
        y(n, r, p);
      }
    });
  });
  p.catch(function (e) {
    return e;
  });
  return p;
}
function E(e) {
  return !!e && e.message !== undefined;
}
function k(e, t) {
  var r = e;
  for (var n = 0; n < t.length; n++) {
    if (r == undefined) {
      return r;
    }
    r = r[t[n]];
  }
  return r;
}
function S(e, t) {
  return function (r) {
    var n;
    n = e.fullFields ? k(t, e.fullFields) : t[r.field || e.fullField];
    if (E(r)) {
      r.field = r.field || e.fullField;
      r.fieldValue = n;
      return r;
    } else {
      return {
        message: typeof r === "function" ? r() : r,
        fieldValue: n,
        field: r.field || e.fullField
      };
    }
  };
}
function T(e, t) {
  if (t) {
    for (var r in t) {
      if (t.hasOwnProperty(r)) {
        var i = t[r];
        if (typeof i === "object" && typeof e[r] === "object") {
          e[r] = n({}, e[r], i);
        } else {
          e[r] = i;
        }
      }
    }
  }
  return e;
}
var C;
function A(e, t, r, n, i, o) {
  if (!!e.required && (!r.hasOwnProperty(e.field) || !!v(t, o || e.type))) {
    n.push(g(i.messages.required, e.fullField));
  }
}
function _(e, t, r, n, i) {
  if (/^\s+$/.test(t) || t === "") {
    n.push(g(i.messages.whitespace, e.fullField));
  }
}
function O() {
  if (C) {
    return C;
  }
  var e = "[a-fA-F\\d:]";
  function t(t) {
    if (t && t.includeBoundaries) {
      return "(?:(?<=\\s|^)(?=" + e + ")|(?<=" + e + ")(?=\\s|$))";
    } else {
      return "";
    }
  }
  var r = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}";
  var n = "[a-fA-F\\d]{1,4}";
  var i = ("\n(?:\n(?:" + n + ":){7}(?:" + n + "|:)|                                    // 1:2:3:4:5:6:7::  1:2:3:4:5:6:7:8\n(?:" + n + ":){6}(?:" + r + "|:" + n + "|:)|                             // 1:2:3:4:5:6::    1:2:3:4:5:6::8   1:2:3:4:5:6::8  1:2:3:4:5:6::1.2.3.4\n(?:" + n + ":){5}(?::" + r + "|(?::" + n + "){1,2}|:)|                   // 1:2:3:4:5::      1:2:3:4:5::7:8   1:2:3:4:5::8    1:2:3:4:5::7:1.2.3.4\n(?:" + n + ":){4}(?:(?::" + n + "){0,1}:" + r + "|(?::" + n + "){1,3}|:)| // 1:2:3:4::        1:2:3:4::6:7:8   1:2:3:4::8      1:2:3:4::6:7:1.2.3.4\n(?:" + n + ":){3}(?:(?::" + n + "){0,2}:" + r + "|(?::" + n + "){1,4}|:)| // 1:2:3::          1:2:3::5:6:7:8   1:2:3::8        1:2:3::5:6:7:1.2.3.4\n(?:" + n + ":){2}(?:(?::" + n + "){0,3}:" + r + "|(?::" + n + "){1,5}|:)| // 1:2::            1:2::4:5:6:7:8   1:2::8          1:2::4:5:6:7:1.2.3.4\n(?:" + n + ":){1}(?:(?::" + n + "){0,4}:" + r + "|(?::" + n + "){1,6}|:)| // 1::              1::3:4:5:6:7:8   1::8            1::3:4:5:6:7:1.2.3.4\n(?::(?:(?::" + n + "){0,5}:" + r + "|(?::" + n + "){1,7}|:))             // ::2:3:4:5:6:7:8  ::2:3:4:5:6:7:8  ::8             ::1.2.3.4\n)(?:%[0-9a-zA-Z]{1,})?                                             // %eth0            %1\n").replace(/\s*\/\/.*$/gm, "").replace(/\n/g, "").trim();
  var o = new RegExp("(?:^" + r + "$)|(?:^" + i + "$)");
  var a = new RegExp("^" + r + "$");
  var s = new RegExp("^" + i + "$");
  function u(e) {
    if (e && e.exact) {
      return o;
    } else {
      return new RegExp("(?:" + t(e) + r + t(e) + ")|(?:" + t(e) + i + t(e) + ")", "g");
    }
  }
  u.v4 = function (e) {
    if (e && e.exact) {
      return a;
    } else {
      return new RegExp("" + t(e) + r + t(e), "g");
    }
  };
  u.v6 = function (e) {
    if (e && e.exact) {
      return s;
    } else {
      return new RegExp("" + t(e) + i + t(e), "g");
    }
  };
  var l = "(?:(?:[a-z]+:)?//)";
  var c = "(?:\\S+(?::\\S*)?@)?";
  var p = u.v4().source;
  var d = u.v6().source;
  var f = "(?:(?:[a-z\\u00a1-\\uffff0-9][-_]*)*[a-z\\u00a1-\\uffff0-9]+)";
  var g = "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*";
  var m = "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))";
  var v = "(?::\\d{2,5})?";
  var y = "(?:[/?#][^\\s\"]*)?";
  var h = "(?:" + l + "|www\\.)" + c + "(?:localhost|" + p + "|" + d + "|" + f + g + m + ")" + v + y;
  C = new RegExp("(?:^" + h + "$)", "i");
  return C;
}
var M = {
  email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+\.)+[a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]{2,}))$/,
  hex: /^#?([a-f0-9]{6}|[a-f0-9]{3})$/i
};
var P = {
  integer: function (e) {
    return P.number(e) && parseInt(e, 10) === e;
  },
  float: function (e) {
    return P.number(e) && !P.integer(e);
  },
  array: function (e) {
    return Array.isArray(e);
  },
  regexp: function (e) {
    if (e instanceof RegExp) {
      return true;
    }
    try {
      return !!new RegExp(e);
    } catch (t) {
      return false;
    }
  },
  date: function (e) {
    return typeof e.getTime === "function" && typeof e.getMonth === "function" && typeof e.getYear === "function" && !isNaN(e.getTime());
  },
  number: function (e) {
    return !isNaN(e) && typeof e === "number";
  },
  object: function (e) {
    return typeof e === "object" && !P.array(e);
  },
  method: function (e) {
    return typeof e === "function";
  },
  email: function (e) {
    return typeof e === "string" && e.length <= 320 && !!e.match(M.email);
  },
  url: function (e) {
    return typeof e === "string" && e.length <= 2048 && !!e.match(O());
  },
  hex: function (e) {
    return typeof e === "string" && !!e.match(M.hex);
  }
};
function q(e, t, r, n, i) {
  if (e.required && t === undefined) {
    A(e, t, r, n, i);
  } else {
    var o = ["integer", "float", "array", "regexp", "object", "method", "email", "number", "date", "url", "hex"];
    var a = e.type;
    if (o.indexOf(a) > -1) {
      if (!P[a](t)) {
        n.push(g(i.messages.types[a], e.fullField, e.type));
      }
    } else if (a && typeof t !== e.type) {
      n.push(g(i.messages.types[a], e.fullField, e.type));
    }
  }
}
function N(e, t, r, n, i) {
  var o = typeof e.len === "number";
  var a = typeof e.min === "number";
  var s = typeof e.max === "number";
  var u = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
  var l = t;
  var c = null;
  var p = typeof t === "number";
  var d = typeof t === "string";
  var f = Array.isArray(t);
  if (p) {
    c = "number";
  } else if (d) {
    c = "string";
  } else if (f) {
    c = "array";
  }
  if (!c) {
    return false;
  }
  if (f) {
    l = t.length;
  }
  if (d) {
    l = t.replace(u, "_").length;
  }
  if (o) {
    if (l !== e.len) {
      n.push(g(i.messages[c].len, e.fullField, e.len));
    }
  } else if (a && !s && l < e.min) {
    n.push(g(i.messages[c].min, e.fullField, e.min));
  } else if (s && !a && l > e.max) {
    n.push(g(i.messages[c].max, e.fullField, e.max));
  } else if (a && s && (l < e.min || l > e.max)) {
    n.push(g(i.messages[c].range, e.fullField, e.min, e.max));
  }
}
var R = "enum";
function I(e, t, r, n, i) {
  e[R] = Array.isArray(e[R]) ? e[R] : [];
  if (e[R].indexOf(t) === -1) {
    n.push(g(i.messages[R], e.fullField, e[R].join(", ")));
  }
}
function j(e, t, r, n, i) {
  if (e.pattern) {
    if (e.pattern instanceof RegExp) {
      e.pattern.lastIndex = 0;
      if (!e.pattern.test(t)) {
        n.push(g(i.messages.pattern.mismatch, e.fullField, t, e.pattern));
      }
    } else if (typeof e.pattern === "string") {
      var o = new RegExp(e.pattern);
      if (!o.test(t)) {
        n.push(g(i.messages.pattern.mismatch, e.fullField, t, e.pattern));
      }
    }
  }
}
var D = {
  required: A,
  whitespace: _,
  type: q,
  range: N,
  enum: I,
  pattern: j
};
function L(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if (v(t, "string") && !e.required) {
      return r();
    }
    D.required(e, t, n, o, i, "string");
    if (!v(t, "string")) {
      D.type(e, t, n, o, i);
      D.range(e, t, n, o, i);
      D.pattern(e, t, n, o, i);
      if (e.whitespace === true) {
        D.whitespace(e, t, n, o, i);
      }
    }
  }
  r(o);
}
function F(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if (v(t) && !e.required) {
      return r();
    }
    D.required(e, t, n, o, i);
    if (t !== undefined) {
      D.type(e, t, n, o, i);
    }
  }
  r(o);
}
function Z(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if (t === "") {
      t = undefined;
    }
    if (v(t) && !e.required) {
      return r();
    }
    D.required(e, t, n, o, i);
    if (t !== undefined) {
      D.type(e, t, n, o, i);
      D.range(e, t, n, o, i);
    }
  }
  r(o);
}
function z(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if (v(t) && !e.required) {
      return r();
    }
    D.required(e, t, n, o, i);
    if (t !== undefined) {
      D.type(e, t, n, o, i);
    }
  }
  r(o);
}
function U(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if (v(t) && !e.required) {
      return r();
    }
    D.required(e, t, n, o, i);
    if (!v(t)) {
      D.type(e, t, n, o, i);
    }
  }
  r(o);
}
function B(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if (v(t) && !e.required) {
      return r();
    }
    D.required(e, t, n, o, i);
    if (t !== undefined) {
      D.type(e, t, n, o, i);
      D.range(e, t, n, o, i);
    }
  }
  r(o);
}
function V(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if (v(t) && !e.required) {
      return r();
    }
    D.required(e, t, n, o, i);
    if (t !== undefined) {
      D.type(e, t, n, o, i);
      D.range(e, t, n, o, i);
    }
  }
  r(o);
}
function H(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if ((t === undefined || t === null) && !e.required) {
      return r();
    }
    D.required(e, t, n, o, i, "array");
    if (t !== undefined && t !== null) {
      D.type(e, t, n, o, i);
      D.range(e, t, n, o, i);
    }
  }
  r(o);
}
function W(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if (v(t) && !e.required) {
      return r();
    }
    D.required(e, t, n, o, i);
    if (t !== undefined) {
      D.type(e, t, n, o, i);
    }
  }
  r(o);
}
var Y = "enum";
function Q(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if (v(t) && !e.required) {
      return r();
    }
    D.required(e, t, n, o, i);
    if (t !== undefined) {
      D[Y](e, t, n, o, i);
    }
  }
  r(o);
}
function $(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if (v(t, "string") && !e.required) {
      return r();
    }
    D.required(e, t, n, o, i);
    if (!v(t, "string")) {
      D.pattern(e, t, n, o, i);
    }
  }
  r(o);
}
function G(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if (v(t, "date") && !e.required) {
      return r();
    }
    var s;
    D.required(e, t, n, o, i);
    if (!v(t, "date")) {
      s = t instanceof Date ? t : new Date(t);
      D.type(e, s, n, o, i);
      if (s) {
        D.range(e, s.getTime(), n, o, i);
      }
    }
  }
  r(o);
}
function K(e, t, r, n, i) {
  var o = [];
  var a = Array.isArray(t) ? "array" : typeof t;
  D.required(e, t, n, o, i, a);
  r(o);
}
function J(e, t, r, n, i) {
  var o = e.type;
  var a = [];
  var s = e.required || !e.required && n.hasOwnProperty(e.field);
  if (s) {
    if (v(t, o) && !e.required) {
      return r();
    }
    D.required(e, t, n, a, i, o);
    if (!v(t, o)) {
      D.type(e, t, n, a, i);
    }
  }
  r(a);
}
function X(e, t, r, n, i) {
  var o = [];
  var a = e.required || !e.required && n.hasOwnProperty(e.field);
  if (a) {
    if (v(t) && !e.required) {
      return r();
    }
    D.required(e, t, n, o, i);
  }
  r(o);
}
var ee = {
  string: L,
  method: F,
  number: Z,
  boolean: z,
  regexp: U,
  integer: B,
  float: V,
  array: H,
  object: W,
  enum: Q,
  pattern: $,
  date: G,
  url: J,
  hex: J,
  email: J,
  required: K,
  any: X
};
function te() {
  return {
    default: "Validation error on field %s",
    required: "%s is required",
    enum: "%s must be one of %s",
    whitespace: "%s cannot be empty",
    date: {
      format: "%s date %s is invalid for format %s",
      parse: "%s date could not be parsed, %s is invalid ",
      invalid: "%s date %s is invalid"
    },
    types: {
      string: "%s is not a %s",
      method: "%s is not a %s (function)",
      array: "%s is not an %s",
      object: "%s is not an %s",
      number: "%s is not a %s",
      date: "%s is not a %s",
      boolean: "%s is not a %s",
      integer: "%s is not an %s",
      float: "%s is not a %s",
      regexp: "%s is not a valid %s",
      email: "%s is not a valid %s",
      url: "%s is not a valid %s",
      hex: "%s is not a valid %s"
    },
    string: {
      len: "%s must be exactly %s characters",
      min: "%s must be at least %s characters",
      max: "%s cannot be longer than %s characters",
      range: "%s must be between %s and %s characters"
    },
    number: {
      len: "%s must equal %s",
      min: "%s cannot be less than %s",
      max: "%s cannot be greater than %s",
      range: "%s must be between %s and %s"
    },
    array: {
      len: "%s must be exactly %s in length",
      min: "%s cannot be less than %s in length",
      max: "%s cannot be greater than %s in length",
      range: "%s must be between %s and %s in length"
    },
    pattern: {
      mismatch: "%s value %s does not match pattern %s"
    },
    clone: function () {
      var e = JSON.parse(JSON.stringify(this));
      e.clone = this.clone;
      return e;
    }
  };
}
var re = te();
var ne = function () {
  function e(e) {
    this.rules = null;
    this._messages = re;
    this.define(e);
  }
  var t = e.prototype;
  t.define = function (e) {
    var t = this;
    if (!e) {
      throw new Error("Cannot configure a schema with no rules");
    }
    if (typeof e !== "object" || Array.isArray(e)) {
      throw new Error("Rules must be an object");
    }
    this.rules = {};
    Object.keys(e).forEach(function (r) {
      var n = e[r];
      t.rules[r] = Array.isArray(n) ? n : [n];
    });
  };
  t.messages = function (e) {
    if (e) {
      this._messages = T(te(), e);
    }
    return this._messages;
  };
  t.validate = function (t, r, i) {
    var o = this;
    if (r === undefined) {
      r = {};
    }
    if (i === undefined) {
      i = function () {};
    }
    var a = t;
    var s = r;
    var u = i;
    if (typeof s === "function") {
      u = s;
      s = {};
    }
    if (!this.rules || Object.keys(this.rules).length === 0) {
      if (u) {
        u(null, a);
      }
      return Promise.resolve(a);
    }
    function l(e) {
      var t = [];
      var r = {};
      function n(e) {
        var r;
        if (Array.isArray(e)) {
          t = (r = t).concat.apply(r, e);
        } else {
          t.push(e);
        }
      }
      for (var i = 0; i < e.length; i++) {
        n(e[i]);
      }
      if (t.length) {
        r = f(t);
        u(t, r);
      } else {
        u(null, a);
      }
    }
    if (s.messages) {
      var c = this.messages();
      if (c === re) {
        c = te();
      }
      T(c, s.messages);
      s.messages = c;
    } else {
      s.messages = this.messages();
    }
    var p = {};
    var d = s.keys || Object.keys(this.rules);
    d.forEach(function (e) {
      var r = o.rules[e];
      var i = a[e];
      r.forEach(function (r) {
        var s = r;
        if (typeof s.transform === "function") {
          if (a === t) {
            a = n({}, a);
          }
          i = a[e] = s.transform(i);
        }
        s = typeof s === "function" ? {
          validator: s
        } : n({}, s);
        s.validator = o.getValidationMethod(s);
        if (s.validator) {
          s.field = e;
          s.fullField = s.fullField || e;
          s.type = o.getType(s);
          p[e] = p[e] || [];
          p[e].push({
            rule: s,
            value: i,
            source: a,
            field: e
          });
        }
      });
    });
    var m = {};
    return x(p, s, function (t, r) {
      var i;
      var o = t.rule;
      var u = (o.type === "object" || o.type === "array") && (typeof o.fields === "object" || typeof o.defaultField === "object");
      function l(e, t) {
        return n({}, t, {
          fullField: o.fullField + "." + e,
          fullFields: o.fullFields ? [].concat(o.fullFields, [e]) : [e]
        });
      }
      function c(i = []) {
        var c = Array.isArray(i) ? i : [i];
        if (!s.suppressWarning && c.length) {
          e.warning("async-validator:", c);
        }
        if (c.length && o.message !== undefined) {
          c = [].concat(o.message);
        }
        var p = c.map(S(o, a));
        if (s.first && p.length) {
          m[o.field] = 1;
          return r(p);
        }
        if (u) {
          if (o.required && !t.value) {
            if (o.message !== undefined) {
              p = [].concat(o.message).map(S(o, a));
            } else if (s.error) {
              p = [s.error(o, g(s.messages.required, o.field))];
            }
            return r(p);
          }
          var d = {};
          if (o.defaultField) {
            Object.keys(t.value).map(function (e) {
              d[e] = o.defaultField;
            });
          }
          d = n({}, d, t.rule.fields);
          var f = {};
          Object.keys(d).forEach(function (e) {
            var t = d[e];
            var r = Array.isArray(t) ? t : [t];
            f[e] = r.map(l.bind(null, e));
          });
          var v = new e(f);
          v.messages(s.messages);
          if (t.rule.options) {
            t.rule.options.messages = s.messages;
            t.rule.options.error = s.error;
          }
          v.validate(t.value, t.rule.options || s, function (e) {
            var t = [];
            if (p && p.length) {
              t.push.apply(t, p);
            }
            if (e && e.length) {
              t.push.apply(t, e);
            }
            r(t.length ? t : null);
          });
        } else {
          r(p);
        }
      }
      u = u && (o.required || !o.required && t.value);
      o.field = t.field;
      if (o.asyncValidator) {
        i = o.asyncValidator(o, t.value, c, t.source, s);
      } else if (o.validator) {
        try {
          i = o.validator(o, t.value, c, t.source, s);
        } catch (p) {
          if (console.error != null) {
            console.error(p);
          }
          if (!s.suppressValidatorError) {
            setTimeout(function () {
              throw p;
            }, 0);
          }
          c(p.message);
        }
        if (i === true) {
          c();
        } else if (i === false) {
          c(typeof o.message === "function" ? o.message(o.fullField || o.field) : o.message || (o.fullField || o.field) + " fails");
        } else if (i instanceof Array) {
          c(i);
        } else if (i instanceof Error) {
          c(i.message);
        }
      }
      if (i && i.then) {
        i.then(function () {
          return c();
        }, function (e) {
          return c(e);
        });
      }
    }, function (e) {
      l(e);
    }, a);
  };
  t.getType = function (e) {
    if (e.type === undefined && e.pattern instanceof RegExp) {
      e.type = "pattern";
    }
    if (typeof e.validator !== "function" && e.type && !ee.hasOwnProperty(e.type)) {
      throw new Error(g("Unknown rule type %s", e.type));
    }
    return e.type || "string";
  };
  t.getValidationMethod = function (e) {
    if (typeof e.validator === "function") {
      return e.validator;
    }
    var t = Object.keys(e);
    var r = t.indexOf("message");
    if (r !== -1) {
      t.splice(r, 1);
    }
    if (t.length === 1 && t[0] === "required") {
      return ee.required;
    } else {
      return ee[this.getType(e)] || undefined;
    }
  };
  return e;
}();
ne.register = function (e, t) {
  if (typeof t !== "function") {
    throw new Error("Cannot register a validator by type, validator is not a function");
  }
  ee[e] = t;
};
ne.warning = d;
ne.messages = re;
ne.validators = ee;
};
