// webpack module 51705 — body from webcrack
module.exports = function (module, exports, require) {
var n;
var i;
var o;
(function (r) {
  i = [];
  n = r;
  o = typeof n === "function" ? n.apply(exports, i) : n;
  if (o !== undefined) {
    module.exports = o;
  }
})(function () {
  "use strict";

  var e;
  var t;
  var n;
  var i;
  var o = typeof window != "undefined" ? window : typeof require.g != undefined ? require.g : this || {};
  var a = o.cancelRequestAnimationFrame && o.requestAnimationFrame || setTimeout;
  var s = o.cancelRequestAnimationFrame || clearTimeout;
  var u = [];
  var l = 0;
  var c = false;
  var p = 7;
  var d = 35;
  var f = 125;
  var g = 0;
  var m = 0;
  var v = 0;
  var y = {
    get didTimeout() {
      return false;
    },
    timeRemaining: function () {
      var e = p - (Date.now() - m);
      if (e < 0) {
        return 0;
      } else {
        return e;
      }
    }
  };
  var h = b(function () {
    p = 22;
    f = 66;
    d = 0;
  });
  function b(e) {
    var t;
    var r;
    var n = 99;
    function i() {
      var o = Date.now() - r;
      if (o < n) {
        t = setTimeout(i, n - o);
      } else {
        t = null;
        e();
      }
    }
    return function () {
      r = Date.now();
      t ||= setTimeout(i, n);
    };
  }
  function w() {
    if (c) {
      if (i) {
        s(i);
      }
      if (n) {
        clearTimeout(n);
      }
      c = false;
    }
  }
  function x() {
    if (f != 125) {
      p = 7;
      f = 125;
      d = 35;
      if (c) {
        w();
        S();
      }
    }
    h();
  }
  function E() {
    i = null;
    n = setTimeout(T, 0);
  }
  function k() {
    n = null;
    a(E);
  }
  function S() {
    if (!c) {
      t = f - (Date.now() - m);
      e = Date.now();
      c = true;
      if (d && t < d) {
        t = d;
      }
      if (t > 9) {
        n = setTimeout(k, t);
      } else {
        t = 0;
        k();
      }
    }
  }
  function T() {
    var r;
    var i;
    var o;
    var a = p > 9 ? 9 : 1;
    m = Date.now();
    c = false;
    n = null;
    if (l > 2 || m - t - 50 < e) {
      i = 0;
      o = u.length;
      for (; i < o && y.timeRemaining() > a; i++) {
        r = u.shift();
        v++;
        if (r) {
          r(y);
        }
      }
    }
    if (u.length) {
      S();
    } else {
      l = 0;
    }
  }
  function C(e) {
    g++;
    u.push(e);
    S();
    return g;
  }
  function A(e) {
    var t = e - 1 - v;
    u[t] &&= null;
  }
  if (o.requestIdleCallback && o.cancelIdleCallback) {
    try {
      o.requestIdleCallback(function () {}, {
        timeout: 0
      });
    } catch (_) {
      (function (e) {
        var t;
        var r;
        o.requestIdleCallback = function (t, r) {
          if (r && typeof r.timeout == "number") {
            return e(t, r.timeout);
          } else {
            return e(t);
          }
        };
        if (o.IdleCallbackDeadline && (t = IdleCallbackDeadline.prototype)) {
          r = Object.getOwnPropertyDescriptor(t, "timeRemaining");
          if (!r || !r.configurable || !r.get) {
            return;
          }
          Object.defineProperty(t, "timeRemaining", {
            value: function () {
              return r.get.call(this);
            },
            enumerable: true,
            configurable: true
          });
        }
      })(o.requestIdleCallback);
    }
  } else {
    o.requestIdleCallback = C;
    o.cancelIdleCallback = A;
    if (o.document && document.addEventListener) {
      o.addEventListener("scroll", x, true);
      o.addEventListener("resize", x);
      document.addEventListener("focus", x, true);
      document.addEventListener("mouseover", x, true);
      ["click", "keypress", "touchstart", "mousedown"].forEach(function (e) {
        document.addEventListener(e, x, {
          capture: true,
          passive: true
        });
      });
      if (o.MutationObserver) {
        new MutationObserver(x).observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true
        });
      }
    }
  }
  return {
    request: C,
    cancel: A
  };
});
};
