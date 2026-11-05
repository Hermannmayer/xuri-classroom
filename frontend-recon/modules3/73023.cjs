// webpack module 73023 — body from webcrack
module.exports = function (module, exports, require) {
var n = function () {
  if (typeof Map !== "undefined") {
    return Map;
  }
  function e(e, t) {
    var r = -1;
    e.some(function (e, n) {
      return e[0] === t && (r = n, true);
    });
    return r;
  }
  return function () {
    function t() {
      this.__entries__ = [];
    }
    Object.defineProperty(t.prototype, "size", {
      get: function () {
        return this.__entries__.length;
      },
      enumerable: true,
      configurable: true
    });
    t.prototype.get = function (t) {
      var r = e(this.__entries__, t);
      var n = this.__entries__[r];
      return n && n[1];
    };
    t.prototype.set = function (t, r) {
      var n = e(this.__entries__, t);
      if (~n) {
        this.__entries__[n][1] = r;
      } else {
        this.__entries__.push([t, r]);
      }
    };
    t.prototype.delete = function (t) {
      var r = this.__entries__;
      var n = e(r, t);
      if (~n) {
        r.splice(n, 1);
      }
    };
    t.prototype.has = function (t) {
      return !!~e(this.__entries__, t);
    };
    t.prototype.clear = function () {
      this.__entries__.splice(0);
    };
    t.prototype.forEach = function (e, t = null) {
      for (var r = 0, n = this.__entries__; r < n.length; r++) {
        var i = n[r];
        e.call(t, i[1], i[0]);
      }
    };
    return t;
  }();
}();
var i = typeof window !== "undefined" && typeof document !== "undefined" && window.document === document;
var o = function () {
  if (typeof require.g !== "undefined" && require.g.Math === Math) {
    return require.g;
  } else if (typeof self !== "undefined" && self.Math === Math) {
    return self;
  } else if (typeof window !== "undefined" && window.Math === Math) {
    return window;
  } else {
    return Function("return this")();
  }
}();
var a = function () {
  if (typeof requestAnimationFrame === "function") {
    return requestAnimationFrame.bind(o);
  } else {
    return function (e) {
      return setTimeout(function () {
        return e(Date.now());
      }, 1000 / 60);
    };
  }
}();
var s = 2;
function u(e, t) {
  var r = false;
  var n = false;
  var i = 0;
  function o() {
    if (r) {
      r = false;
      e();
    }
    if (n) {
      l();
    }
  }
  function u() {
    a(o);
  }
  function l() {
    var e = Date.now();
    if (r) {
      if (e - i < s) {
        return;
      }
      n = true;
    } else {
      r = true;
      n = false;
      setTimeout(u, t);
    }
    i = e;
  }
  return l;
}
var l = 20;
var c = ["top", "right", "bottom", "left", "width", "height", "size", "weight"];
var p = typeof MutationObserver !== "undefined";
var d = function () {
  function e() {
    this.connected_ = false;
    this.mutationEventsAdded_ = false;
    this.mutationsObserver_ = null;
    this.observers_ = [];
    this.onTransitionEnd_ = this.onTransitionEnd_.bind(this);
    this.refresh = u(this.refresh.bind(this), l);
  }
  e.prototype.addObserver = function (e) {
    if (!~this.observers_.indexOf(e)) {
      this.observers_.push(e);
    }
    if (!this.connected_) {
      this.connect_();
    }
  };
  e.prototype.removeObserver = function (e) {
    var t = this.observers_;
    var r = t.indexOf(e);
    if (~r) {
      t.splice(r, 1);
    }
    if (!t.length && this.connected_) {
      this.disconnect_();
    }
  };
  e.prototype.refresh = function () {
    var e = this.updateObservers_();
    if (e) {
      this.refresh();
    }
  };
  e.prototype.updateObservers_ = function () {
    var e = this.observers_.filter(function (e) {
      e.gatherActive();
      return e.hasActive();
    });
    e.forEach(function (e) {
      return e.broadcastActive();
    });
    return e.length > 0;
  };
  e.prototype.connect_ = function () {
    if (i && !this.connected_) {
      document.addEventListener("transitionend", this.onTransitionEnd_);
      window.addEventListener("resize", this.refresh);
      if (p) {
        this.mutationsObserver_ = new MutationObserver(this.refresh);
        this.mutationsObserver_.observe(document, {
          attributes: true,
          childList: true,
          characterData: true,
          subtree: true
        });
      } else {
        document.addEventListener("DOMSubtreeModified", this.refresh);
        this.mutationEventsAdded_ = true;
      }
      this.connected_ = true;
    }
  };
  e.prototype.disconnect_ = function () {
    if (i && this.connected_) {
      document.removeEventListener("transitionend", this.onTransitionEnd_);
      window.removeEventListener("resize", this.refresh);
      if (this.mutationsObserver_) {
        this.mutationsObserver_.disconnect();
      }
      if (this.mutationEventsAdded_) {
        document.removeEventListener("DOMSubtreeModified", this.refresh);
      }
      this.mutationsObserver_ = null;
      this.mutationEventsAdded_ = false;
      this.connected_ = false;
    }
  };
  e.prototype.onTransitionEnd_ = function (e) {
    var t = e.propertyName;
    var r = t === undefined ? "" : t;
    var n = c.some(function (e) {
      return !!~r.indexOf(e);
    });
    if (n) {
      this.refresh();
    }
  };
  e.getInstance = function () {
    this.instance_ ||= new e();
    return this.instance_;
  };
  e.instance_ = null;
  return e;
}();
function f(e, t) {
  for (var r = 0, n = Object.keys(t); r < n.length; r++) {
    var i = n[r];
    Object.defineProperty(e, i, {
      value: t[i],
      enumerable: false,
      writable: false,
      configurable: true
    });
  }
  return e;
}
function g(e) {
  var t = e && e.ownerDocument && e.ownerDocument.defaultView;
  return t || o;
}
var m = T(0, 0, 0, 0);
function v(e) {
  return parseFloat(e) || 0;
}
function y(e) {
  var t = [];
  for (var r = 1; r < arguments.length; r++) {
    t[r - 1] = arguments[r];
  }
  return t.reduce(function (t, r) {
    var n = e["border-" + r + "-width"];
    return t + v(n);
  }, 0);
}
function h(e) {
  var t = ["top", "right", "bottom", "left"];
  var r = {};
  for (var n = 0, i = t; n < i.length; n++) {
    var o = i[n];
    var a = e["padding-" + o];
    r[o] = v(a);
  }
  return r;
}
function b(e) {
  var t = e.getBBox();
  return T(0, 0, t.width, t.height);
}
function w(e) {
  var t = e.clientWidth;
  var r = e.clientHeight;
  if (!t && !r) {
    return m;
  }
  var n = g(e).getComputedStyle(e);
  var i = h(n);
  var o = i.left + i.right;
  var a = i.top + i.bottom;
  var s = v(n.width);
  var u = v(n.height);
  if (n.boxSizing === "border-box") {
    if (Math.round(s + o) !== t) {
      s -= y(n, "left", "right") + o;
    }
    if (Math.round(u + a) !== r) {
      u -= y(n, "top", "bottom") + a;
    }
  }
  if (!E(e)) {
    var l = Math.round(s + o) - t;
    var c = Math.round(u + a) - r;
    if (Math.abs(l) !== 1) {
      s -= l;
    }
    if (Math.abs(c) !== 1) {
      u -= c;
    }
  }
  return T(i.left, i.top, s, u);
}
var x = function () {
  if (typeof SVGGraphicsElement !== "undefined") {
    return function (e) {
      return e instanceof g(e).SVGGraphicsElement;
    };
  } else {
    return function (e) {
      return e instanceof g(e).SVGElement && typeof e.getBBox === "function";
    };
  }
}();
function E(e) {
  return e === g(e).document.documentElement;
}
function k(e) {
  if (i) {
    if (x(e)) {
      return b(e);
    } else {
      return w(e);
    }
  } else {
    return m;
  }
}
function S(e) {
  var t = e.x;
  var r = e.y;
  var n = e.width;
  var i = e.height;
  var o = typeof DOMRectReadOnly !== "undefined" ? DOMRectReadOnly : Object;
  var a = Object.create(o.prototype);
  f(a, {
    x: t,
    y: r,
    width: n,
    height: i,
    top: r,
    right: t + n,
    bottom: i + r,
    left: t
  });
  return a;
}
function T(e, t, r, n) {
  return {
    x: e,
    y: t,
    width: r,
    height: n
  };
}
var C = function () {
  function e(e) {
    this.broadcastWidth = 0;
    this.broadcastHeight = 0;
    this.contentRect_ = T(0, 0, 0, 0);
    this.target = e;
  }
  e.prototype.isActive = function () {
    var e = k(this.target);
    this.contentRect_ = e;
    return e.width !== this.broadcastWidth || e.height !== this.broadcastHeight;
  };
  e.prototype.broadcastRect = function () {
    var e = this.contentRect_;
    this.broadcastWidth = e.width;
    this.broadcastHeight = e.height;
    return e;
  };
  return e;
}();
var A = function () {
  function e(e, t) {
    var r = S(t);
    f(this, {
      target: e,
      contentRect: r
    });
  }
  return e;
}();
var _ = function () {
  function e(e, t, r) {
    this.activeObservations_ = [];
    this.observations_ = new n();
    if (typeof e !== "function") {
      throw new TypeError("The callback provided as parameter 1 is not a function.");
    }
    this.callback_ = e;
    this.controller_ = t;
    this.callbackCtx_ = r;
  }
  e.prototype.observe = function (e) {
    if (!arguments.length) {
      throw new TypeError("1 argument required, but only 0 present.");
    }
    if (typeof Element !== "undefined" && Element instanceof Object) {
      if (!(e instanceof g(e).Element)) {
        throw new TypeError("parameter 1 is not of type \"Element\".");
      }
      var t = this.observations_;
      if (!t.has(e)) {
        t.set(e, new C(e));
        this.controller_.addObserver(this);
        this.controller_.refresh();
      }
    }
  };
  e.prototype.unobserve = function (e) {
    if (!arguments.length) {
      throw new TypeError("1 argument required, but only 0 present.");
    }
    if (typeof Element !== "undefined" && Element instanceof Object) {
      if (!(e instanceof g(e).Element)) {
        throw new TypeError("parameter 1 is not of type \"Element\".");
      }
      var t = this.observations_;
      if (t.has(e)) {
        t.delete(e);
        if (!t.size) {
          this.controller_.removeObserver(this);
        }
      }
    }
  };
  e.prototype.disconnect = function () {
    this.clearActive();
    this.observations_.clear();
    this.controller_.removeObserver(this);
  };
  e.prototype.gatherActive = function () {
    var e = this;
    this.clearActive();
    this.observations_.forEach(function (t) {
      if (t.isActive()) {
        e.activeObservations_.push(t);
      }
    });
  };
  e.prototype.broadcastActive = function () {
    if (this.hasActive()) {
      var e = this.callbackCtx_;
      var t = this.activeObservations_.map(function (e) {
        return new A(e.target, e.broadcastRect());
      });
      this.callback_.call(e, t, e);
      this.clearActive();
    }
  };
  e.prototype.clearActive = function () {
    this.activeObservations_.splice(0);
  };
  e.prototype.hasActive = function () {
    return this.activeObservations_.length > 0;
  };
  return e;
}();
var O = typeof WeakMap !== "undefined" ? new WeakMap() : new n();
var M = function () {
  function e(t) {
    if (!(this instanceof e)) {
      throw new TypeError("Cannot call a class as a function.");
    }
    if (!arguments.length) {
      throw new TypeError("1 argument required, but only 0 present.");
    }
    var r = d.getInstance();
    var n = new _(t, r, this);
    O.set(this, n);
  }
  return e;
}();
["observe", "unobserve", "disconnect"].forEach(function (e) {
  M.prototype[e] = function () {
    var t;
    return (t = O.get(this))[e].apply(t, arguments);
  };
});
var P = function () {
  if (typeof o.ResizeObserver !== "undefined") {
    return o.ResizeObserver;
  } else {
    return M;
  }
}();
exports.default = P;
};
