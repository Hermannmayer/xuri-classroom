// webpack module 43430 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  rU: function () {
    return v;
  },
  OL: function () {
    return w;
  }
});
var n = require("./83978.js");
var i = require("./28428.js");
var o = require("./59496.js");
var a = require("./88631.js");
var s = require("./34256.js");
var u = require("./96128.js");
var l = require("./65946.js");
o.Component;
o.Component;
function c(e, t) {
  if (typeof e === "function") {
    return e(t);
  } else {
    return e;
  }
}
function p(e, t) {
  if (typeof e === "string") {
    return (0, a.ob)(e, null, null, t);
  } else {
    return e;
  }
}
function d(e) {
  return e;
}
var f = o.forwardRef;
function g(e) {
  return !!e.metaKey || !!e.altKey || !!e.ctrlKey || !!e.shiftKey;
}
if (typeof f === "undefined") {
  f = d;
}
var m = f(function (e, t) {
  var r = e.innerRef;
  var n = e.navigate;
  var i = e.onClick;
  var a = (0, u.Z)(e, ["innerRef", "navigate", "onClick"]);
  var l = a.target;
  var c = (0, s.Z)({}, a, {
    onClick: function (e) {
      try {
        if (i) {
          i(e);
        }
      } catch (t) {
        e.preventDefault();
        throw t;
      }
      if (!e.defaultPrevented && e.button === 0 && (!l || l === "_self") && !g(e)) {
        e.preventDefault();
        n();
      }
    }
  });
  c.ref = d !== f && t || r;
  return o.createElement("a", c);
});
var v = f(function (e, t) {
  var r = e.component;
  var i = r === undefined ? m : r;
  var a = e.replace;
  var g = e.to;
  var v = e.innerRef;
  var y = (0, u.Z)(e, ["component", "replace", "to", "innerRef"]);
  return o.createElement(n.s6.Consumer, null, function (e) {
    if (!e) {
      (0, l.Z)(false);
    }
    var r = e.history;
    var n = p(c(g, e.location), e.location);
    var u = n ? r.createHref(n) : "";
    var m = (0, s.Z)({}, y, {
      href: u,
      navigate: function () {
        var t = c(g, e.location);
        var n = a ? r.replace : r.push;
        n(t);
      }
    });
    if (d !== f) {
      m.ref = t || v;
    } else {
      m.innerRef = v;
    }
    return o.createElement(i, m);
  });
});
function y(e) {
  return e;
}
var h = o.forwardRef;
function b() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
    t[r] = arguments[r];
  }
  return t.filter(function (e) {
    return e;
  }).join(" ");
}
if (typeof h === "undefined") {
  h = y;
}
var w = h(function (e, t) {
  var r = e["aria-current"];
  var i = r === undefined ? "page" : r;
  var a = e.activeClassName;
  var d = a === undefined ? "active" : a;
  var f = e.activeStyle;
  var g = e.className;
  var m = e.exact;
  var w = e.isActive;
  var x = e.location;
  var E = e.sensitive;
  var k = e.strict;
  var S = e.style;
  var T = e.to;
  var C = e.innerRef;
  var A = (0, u.Z)(e, ["aria-current", "activeClassName", "activeStyle", "className", "exact", "isActive", "location", "sensitive", "strict", "style", "to", "innerRef"]);
  return o.createElement(n.s6.Consumer, null, function (e) {
    if (!e) {
      (0, l.Z)(false);
    }
    var r = x || e.location;
    var a = p(c(T, r), r);
    var u = a.pathname;
    var _ = u && u.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
    var O = _ ? (0, n.LX)(r.pathname, {
      path: _,
      exact: m,
      sensitive: E,
      strict: k
    }) : null;
    var M = !!(w ? w(O, r) : O);
    var P = M ? b(g, d) : g;
    var q = M ? (0, s.Z)({}, S, {}, f) : S;
    var N = (0, s.Z)({
      "aria-current": M && i || null,
      className: P,
      style: q,
      to: a
    }, A);
    if (y !== h) {
      N.ref = t || C;
    } else {
      N.innerRef = C;
    }
    return o.createElement(v, N);
  });
});
};
