// webpack module 3570 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return T;
  }
});
var n = require("./23874.js");
var i = require("./59496.js");
var o = require("./87995.js");
var a = require("./67361.js");
require("./68044.js");
var s = require("./97969.js");
var u = i.createContext(null);
var l = u;
var c = require("./66439.js");
var p = require("./88174.js");
var d = [];
function f(e, t) {
  var r = i.useState(function () {
    if (!(0, a.Z)()) {
      return null;
    }
    var e = document.createElement("div");
    return e;
  });
  var o = (0, n.Z)(r, 1);
  var s = o[0];
  var u = i.useRef(false);
  var f = i.useContext(l);
  var g = i.useState(d);
  var m = (0, n.Z)(g, 2);
  var v = m[0];
  var y = m[1];
  var h = f || (u.current ? undefined : function (e) {
    y(function (t) {
      var r = [e].concat((0, c.Z)(t));
      return r;
    });
  });
  function b() {
    if (!s.parentElement) {
      document.body.appendChild(s);
    }
    u.current = true;
  }
  function w() {
    var e;
    if ((e = s.parentElement) !== null && e !== undefined) {
      e.removeChild(s);
    }
    u.current = false;
  }
  (0, p.Z)(function () {
    if (e) {
      if (f) {
        f(b);
      } else {
        b();
      }
    } else {
      w();
    }
    return w;
  }, [e]);
  (0, p.Z)(function () {
    if (v.length) {
      v.forEach(function (e) {
        return e();
      });
      y(d);
    }
  }, [v]);
  return [s, h];
}
var g = require("./96417.js");
var m = require("./83415.js");
function v() {
  return document.body.scrollHeight > (window.innerHeight || document.documentElement.clientHeight) && window.innerWidth > document.body.offsetWidth;
}
var y = `rc-util-locker-${Date.now()}`;
var h = 0;
function b(e) {
  var t = !!e;
  var r = i.useState(function () {
    h += 1;
    return `${y}_${h}`;
  });
  var o = (0, n.Z)(r, 1);
  var a = o[0];
  (0, p.Z)(function () {
    if (t) {
      var e = (0, m.o)(document.body).width;
      var r = v();
      (0, g.hq)(`
html body {
  overflow-y: hidden;
  ${r ? `width: calc(100% - ${e}px);` : ""}
}`, a);
    } else {
      (0, g.jL)(a);
    }
    return function () {
      (0, g.jL)(a);
    };
  }, [t, a]);
}
var w = false;
function x(e) {
  if (typeof e === "boolean") {
    w = e;
  }
  return w;
}
function E(e) {
  return e !== false && ((0, a.Z)() && e ? typeof e === "string" ? document.querySelector(e) : typeof e === "function" ? e() : e : null);
}
var k = i.forwardRef(function (e, t) {
  var r = e.open;
  var u = e.autoLock;
  var c = e.getContainer;
  var p = e.debug;
  var d = e.autoDestroy;
  var g = d === undefined || d;
  var m = e.children;
  var v = i.useState(r);
  var y = (0, n.Z)(v, 2);
  var h = y[0];
  var w = y[1];
  var k = h || r;
  i.useEffect(function () {
    if (g || r) {
      w(r);
    }
  }, [r, g]);
  var S = i.useState(function () {
    return E(c);
  });
  var T = (0, n.Z)(S, 2);
  var C = T[0];
  var A = T[1];
  i.useEffect(function () {
    var e = E(c);
    A(e ?? null);
  });
  var _ = f(k && !C, p);
  var O = (0, n.Z)(_, 2);
  var M = O[0];
  var P = O[1];
  var q = C ?? M;
  b(u && r && (0, a.Z)() && (q === M || q === document.body));
  var N = null;
  if (m && (0, s.Yr)(m) && t) {
    var R = m;
    N = R.ref;
  }
  var I = (0, s.x1)(N, t);
  if (!k || !(0, a.Z)() || C === undefined) {
    return null;
  }
  var j = q === false || x();
  var D = m;
  if (t) {
    D = i.cloneElement(m, {
      ref: I
    });
  }
  return i.createElement(l.Provider, {
    value: P
  }, j ? D : (0, o.createPortal)(D, q));
});
var S = k;
var T = S;
};
