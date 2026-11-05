// webpack module 96417 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  jL: function () {
    return v;
  },
  hq: function () {
    return h;
  }
});
var n = require("./91613.js");
var i = require("./67361.js");
var o = require("./39323.js");
var a = "data-rc-order";
var s = "data-rc-priority";
var u = "rc-util-key";
var l = new Map();
function c(e = {}) {
  var t = e.mark;
  if (t) {
    if (t.startsWith("data-")) {
      return t;
    } else {
      return `data-${t}`;
    }
  } else {
    return u;
  }
}
function p(e) {
  if (e.attachTo) {
    return e.attachTo;
  }
  var t = document.querySelector("head");
  return t || document.body;
}
function d(e) {
  if (e === "queue") {
    return "prependQueue";
  } else if (e) {
    return "prepend";
  } else {
    return "append";
  }
}
function f(e) {
  return Array.from((l.get(e) || e).children).filter(function (e) {
    return e.tagName === "STYLE";
  });
}
function g(e, t = {}) {
  if (!(0, i.Z)()) {
    return null;
  }
  var r = t.csp;
  var n = t.prepend;
  var o = t.priority;
  var u = o === undefined ? 0 : o;
  var l = d(n);
  var c = l === "prependQueue";
  var g = document.createElement("style");
  g.setAttribute(a, l);
  if (c && u) {
    g.setAttribute(s, `${u}`);
  }
  if (r !== null && r !== undefined && r.nonce) {
    g.nonce = r?.nonce;
  }
  g.innerHTML = e;
  var m = p(t);
  var v = m.firstChild;
  if (n) {
    if (c) {
      var y = (t.styles || f(m)).filter(function (e) {
        if (!["prepend", "prependQueue"].includes(e.getAttribute(a))) {
          return false;
        }
        var t = Number(e.getAttribute(s) || 0);
        return u >= t;
      });
      if (y.length) {
        m.insertBefore(g, y[y.length - 1].nextSibling);
        return g;
      }
    }
    m.insertBefore(g, v);
  } else {
    m.appendChild(g);
  }
  return g;
}
function m(e, t = {}) {
  var r = p(t);
  return (t.styles || f(r)).find(function (r) {
    return r.getAttribute(c(t)) === e;
  });
}
function v(e, t = {}) {
  var r = m(e, t);
  if (r) {
    var n = p(t);
    n.removeChild(r);
  }
}
function y(e, t) {
  var r = l.get(e);
  if (!r || !(0, o.Z)(document, r)) {
    var n = g("", t);
    var i = n.parentNode;
    l.set(e, i);
    e.removeChild(n);
  }
}
function h(e, t, r = {}) {
  var i = p(r);
  var o = f(i);
  var a = (0, n.Z)((0, n.Z)({}, r), {}, {
    styles: o
  });
  y(i, a);
  var s = m(t, a);
  if (s) {
    var u;
    if ((u = a.csp) !== null && u !== undefined && u.nonce && s.nonce !== a.csp?.nonce) {
      s.nonce = a.csp?.nonce;
    }
    if (s.innerHTML !== e) {
      s.innerHTML = e;
    }
    return s;
  }
  var v = g(e, a);
  v.setAttribute(c(a), t);
  return v;
}
};
