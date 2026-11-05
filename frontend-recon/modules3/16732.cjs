// webpack module 16732 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clearContainerCache = b;
exports.injectCSS = m;
exports.removeCSS = y;
exports.updateCSS = w;
var i = n(require("./38524.js"));
var o = n(require("./70330.js"));
var a = n(require("./38433.js"));
var s = "data-rc-order";
var u = "data-rc-priority";
var l = "rc-util-key";
var c = new Map();
function p(e = {}) {
  var t = e.mark;
  if (t) {
    if (t.startsWith("data-")) {
      return t;
    } else {
      return `data-${t}`;
    }
  } else {
    return l;
  }
}
function d(e) {
  if (e.attachTo) {
    return e.attachTo;
  }
  var t = document.querySelector("head");
  return t || document.body;
}
function f(e) {
  if (e === "queue") {
    return "prependQueue";
  } else if (e) {
    return "prepend";
  } else {
    return "append";
  }
}
function g(e) {
  return Array.from((c.get(e) || e).children).filter(function (e) {
    return e.tagName === "STYLE";
  });
}
function m(e, t = {}) {
  if (!(0, o.default)()) {
    return null;
  }
  var r = t.csp;
  var n = t.prepend;
  var i = t.priority;
  var a = i === undefined ? 0 : i;
  var l = f(n);
  var c = l === "prependQueue";
  var p = document.createElement("style");
  p.setAttribute(s, l);
  if (c && a) {
    p.setAttribute(u, `${a}`);
  }
  if (r !== null && r !== undefined && r.nonce) {
    p.nonce = r?.nonce;
  }
  p.innerHTML = e;
  var m = d(t);
  var v = m.firstChild;
  if (n) {
    if (c) {
      var y = (t.styles || g(m)).filter(function (e) {
        if (!["prepend", "prependQueue"].includes(e.getAttribute(s))) {
          return false;
        }
        var t = Number(e.getAttribute(u) || 0);
        return a >= t;
      });
      if (y.length) {
        m.insertBefore(p, y[y.length - 1].nextSibling);
        return p;
      }
    }
    m.insertBefore(p, v);
  } else {
    m.appendChild(p);
  }
  return p;
}
function v(e, t = {}) {
  var r = d(t);
  return (t.styles || g(r)).find(function (r) {
    return r.getAttribute(p(t)) === e;
  });
}
function y(e, t = {}) {
  var r = v(e, t);
  if (r) {
    var n = d(t);
    n.removeChild(r);
  }
}
function h(e, t) {
  var r = c.get(e);
  if (!r || !(0, a.default)(document, r)) {
    var n = m("", t);
    var i = n.parentNode;
    c.set(e, i);
    e.removeChild(n);
  }
}
function b() {
  c.clear();
}
function w(e, t, r = {}) {
  var n = d(r);
  var o = g(n);
  var a = (0, i.default)((0, i.default)({}, r), {}, {
    styles: o
  });
  h(n, a);
  var s = v(t, a);
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
  var f = m(e, a);
  f.setAttribute(p(a), t);
  return f;
}
};
