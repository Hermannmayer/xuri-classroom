// webpack module 60617 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return O;
  }
});
var n = require("./34256.js");
var i = require("./59496.js");
var o = require("./3787.js");
require("./68044.js");
var a = require("./91613.js");
var s = require("./75728.js");
var u = require("./34500.js");
var l = require("./97969.js");
var c = i.createContext(null);
function p(e) {
  var t = e.children;
  var r = e.onBatchResize;
  var n = i.useRef(0);
  var o = i.useRef([]);
  var a = i.useContext(c);
  var s = i.useCallback(function (e, t, i) {
    n.current += 1;
    var s = n.current;
    o.current.push({
      size: e,
      element: t,
      data: i
    });
    Promise.resolve().then(function () {
      if (s === n.current) {
        if (r !== null && r !== undefined) {
          r(o.current);
        }
        o.current = [];
      }
    });
    if (a !== null && a !== undefined) {
      a(e, t, i);
    }
  }, [r, a]);
  return i.createElement(c.Provider, {
    value: s
  }, t);
}
var d = require("./73023.js");
var f = new Map();
function g(e) {
  e.forEach(function (e) {
    var t;
    var r = e.target;
    if ((t = f.get(r)) !== null && t !== undefined) {
      t.forEach(function (e) {
        return e(r);
      });
    }
  });
}
var m = new d.default(g);
function v(e, t) {
  if (!f.has(e)) {
    f.set(e, new Set());
    m.observe(e);
  }
  f.get(e).add(t);
}
function y(e, t) {
  if (f.has(e)) {
    f.get(e).delete(t);
    if (!f.get(e).size) {
      m.unobserve(e);
      f.delete(e);
    }
  }
}
var h = require("./8951.js");
var b = require("./45810.js");
var w = require("./78212.js");
var x = require("./19746.js");
var E = function (e) {
  (0, w.Z)(r, e);
  var t = (0, x.Z)(r);
  function r() {
    (0, h.Z)(this, r);
    return t.apply(this, arguments);
  }
  (0, b.Z)(r, [{
    key: "render",
    value: function () {
      return this.props.children;
    }
  }]);
  return r;
}(i.Component);
function k(e, t) {
  var r = e.children;
  var n = e.disabled;
  var o = i.useRef(null);
  var p = i.useRef(null);
  var d = i.useContext(c);
  var f = typeof r === "function";
  var g = f ? r(o) : r;
  var m = i.useRef({
    width: -1,
    height: -1,
    offsetWidth: -1,
    offsetHeight: -1
  });
  var h = !f && i.isValidElement(g) && (0, l.Yr)(g);
  var b = h ? g.ref : null;
  var w = (0, l.x1)(b, o);
  function x() {
    return (0, u.Z)(o.current) || (o.current && (0, s.Z)(o.current) === "object" ? (0, u.Z)(o.current?.nativeElement) : null) || (0, u.Z)(p.current);
  }
  i.useImperativeHandle(t, function () {
    return x();
  });
  var k = i.useRef(e);
  k.current = e;
  var S = i.useCallback(function (e) {
    var t = k.current;
    var r = t.onResize;
    var n = t.data;
    var i = e.getBoundingClientRect();
    var o = i.width;
    var s = i.height;
    var u = e.offsetWidth;
    var l = e.offsetHeight;
    var c = Math.floor(o);
    var p = Math.floor(s);
    if (m.current.width !== c || m.current.height !== p || m.current.offsetWidth !== u || m.current.offsetHeight !== l) {
      var f = {
        width: c,
        height: p,
        offsetWidth: u,
        offsetHeight: l
      };
      m.current = f;
      var g = u === Math.round(o) ? o : u;
      var v = l === Math.round(s) ? s : l;
      var y = (0, a.Z)((0, a.Z)({}, f), {}, {
        offsetWidth: g,
        offsetHeight: v
      });
      if (d !== null && d !== undefined) {
        d(y, e, n);
      }
      if (r) {
        Promise.resolve().then(function () {
          r(y, e);
        });
      }
    }
  }, []);
  i.useEffect(function () {
    var e = x();
    if (e && !n) {
      v(e, S);
    }
    return function () {
      return y(e, S);
    };
  }, [o.current, n]);
  return i.createElement(E, {
    ref: p
  }, h ? i.cloneElement(g, {
    ref: w
  }) : g);
}
var S = i.forwardRef(k);
var T = S;
var C = "rc-observer-key";
function A(e, t) {
  var r = e.children;
  var a = typeof r === "function" ? [r] : (0, o.Z)(r);
  return a.map(function (r, o) {
    var a = r?.key || `${C}-${o}`;
    return i.createElement(T, (0, n.Z)({}, e, {
      key: a,
      ref: o === 0 ? t : undefined
    }), r);
  });
}
var _ = i.forwardRef(A);
_.Collection = p;
var O = _;
};
