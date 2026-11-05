// webpack module 73616 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Pi: function () {
    return _;
  },
  cF: function () {
    return O;
  },
  ls: function () {
    return M;
  }
});
var n = require("./59496.js");
var i = require("./72535.js");
var o = i;
var a = require("./87183.js");
var s = typeof document !== "undefined" ? n.useLayoutEffect : n.useEffect;
function u() {
  try {
    if (typeof self !== "undefined") {
      return self;
    }
  } catch (e) {}
  try {
    if (typeof window !== "undefined") {
      return window;
    }
  } catch (e) {}
  try {
    if (typeof require.g !== "undefined") {
      return require.g;
    }
  } catch (e) {}
  return Function("return this")();
}
var l = u();
var c = l.FinalizationRegistry && new l.FinalizationRegistry(function (e) {
  var t;
  if ((t = e?.clean) === null || t === undefined) {
    return undefined;
  } else {
    return t.call(e);
  }
});
var p = function () {
  function e(e, t = 10000) {
    this.token = {
      clean: e
    };
    this.expireTime = t;
  }
  e.prototype.open = function (e) {
    var t = this;
    if (c) {
      c.register(e, this.token, this.token);
    } else {
      this.request = setTimeout(function () {
        var e;
        var r;
        if ((r = (e = t.token) === null || e === undefined ? undefined : e.clean) !== null && r !== undefined) {
          r.call(e);
        }
      }, this.expireTime);
    }
  };
  e.prototype.close = function () {
    if (c) {
      c.unregister(this.token);
    } else {
      clearTimeout(this.request);
    }
  };
  return e;
}();
function d(e) {
  var t = false;
  Promise.resolve(0).then(function () {
    if (t) {
      t = false;
    } else {
      e();
    }
  });
  return function () {
    t = true;
  };
}
function f(e) {
  var t = (0, n.useRef)(null);
  t.current = d(e);
  s(function () {
    t.current();
    e();
  });
}
function g(e, t) {
  var r = typeof Symbol === "function" && e[Symbol.iterator];
  if (!r) {
    return e;
  }
  var n;
  var i;
  var o = r.call(e);
  var a = [];
  try {
    while ((t === undefined || t-- > 0) && !(n = o.next()).done) {
      a.push(n.value);
    }
  } catch (s) {
    i = {
      error: s
    };
  } finally {
    try {
      if (n && !n.done && (r = o.return)) {
        r.call(o);
      }
    } finally {
      if (i) {
        throw i.error;
      }
    }
  }
  return a;
}
var m = [];
var v = {
  value: 0
};
var y = new Set();
function h() {
  var e = g((0, n.useState)([]), 2);
  var t = e[1];
  var r = (0, n.useRef)(false);
  var i = (0, n.useRef)(false);
  s(function () {
    r.current = true;
    if (i.current) {
      t([]);
      i.current = false;
    }
    return function () {
      r.current = false;
    };
  }, m);
  var o = (0, n.useCallback)(function () {
    t([]);
  }, m);
  var a = (0, n.useCallback)(function () {
    if (r.current) {
      if (v.value === 0) {
        o();
      } else {
        y.add(o);
      }
    } else {
      i.current = true;
    }
  }, m);
  v.value++;
  f(function () {
    if (v.value > 0) {
      v.value--;
    }
    if (v.value === 0) {
      y.forEach(function (e) {
        y.delete(e);
        e();
      });
    }
  });
  return a;
}
var b = Array.isArray;
function w(e, t) {
  var r = b(e);
  var n = b(t);
  return r === n && (r ? e.length === t.length && e.every(function (e, r) {
    return e === t[r];
  }) : e === t);
}
function x(e, t) {
  var r = (0, n.useRef)(null);
  var i = (0, n.useRef)(false);
  (0, n.useEffect)(function () {
    i.current = true;
    var n = e();
    return function () {
      i.current = false;
      if (w(r.current, t)) {
        d(function () {
          if (!i.current) {
            if (n) {
              n();
            }
          }
        });
      } else if (n) {
        n();
      }
    };
  }, t);
  r.current = t;
}
function E(e, t) {
  var r = typeof Symbol === "function" && e[Symbol.iterator];
  if (!r) {
    return e;
  }
  var n;
  var i;
  var o = r.call(e);
  var a = [];
  try {
    while ((t === undefined || t-- > 0) && !(n = o.next()).done) {
      a.push(n.value);
    }
  } catch (s) {
    i = {
      error: s
    };
  } finally {
    try {
      if (n && !n.done && (r = o.return)) {
        r.call(o);
      }
    } finally {
      if (i) {
        throw i.error;
      }
    }
  }
  return a;
}
var k = function () {
  function e() {}
  return e;
}();
function S() {
  return new k();
}
function T(e) {
  var t = n.useRef(null);
  var r = n.useRef();
  var i = E(n.useState(S), 1);
  var o = i[0];
  t.current ||= e();
  if (!r.current) {
    r.current = new p(function () {
      if (t.current) {
        t.current.dispose();
      }
    });
    r.current.open(o);
  }
  x(function () {
    r.current.close();
    return function () {
      if (t.current) {
        t.current.dispose();
        t.current = null;
      }
    };
  }, []);
  return t.current;
}
function C(e, t) {
  var r = h();
  var n = T(function () {
    return new a.fX(function () {
      if (typeof t?.scheduler === "function") {
        t.scheduler(r);
      } else {
        r();
      }
    }, t?.displayName);
  });
  return n.track(e);
}
function A() {
  A = Object.assign || function (e) {
    var t;
    for (var r = 1, n = arguments.length; r < n; r++) {
      t = arguments[r];
      for (var i in t) {
        if (Object.prototype.hasOwnProperty.call(t, i)) {
          e[i] = t[i];
        }
      }
    }
    return e;
  };
  return A.apply(this, arguments);
}
function _(e, t) {
  var r = A({
    forwardRef: false
  }, t);
  var i = r.forwardRef ? (0, n.forwardRef)(function (t, n) {
    return C(function () {
      return e(A(A({}, t), {
        ref: n
      }));
    }, r);
  }) : function (t) {
    return C(function () {
      return e(t);
    }, r);
  };
  var a = (0, n.memo)(i);
  o(a, e);
  if (r.displayName) {
    a.displayName = r.displayName;
  }
  return a;
}
_(function (e) {
  var t = typeof e.children === "function" ? e.children() : e.children;
  return n.createElement(n.Fragment, {}, t);
});
var O = x;
var M = T;
};
