// webpack module 19787 — body from webcrack
module.exports = function (module, exports, require) {
var r;
var n;
var i;
var o;
if (typeof performance === "object" && typeof performance.now === "function") {
  var a = performance;
  exports.unstable_now = function () {
    return a.now();
  };
} else {
  var s = Date;
  var u = s.now();
  exports.unstable_now = function () {
    return s.now() - u;
  };
}
if (typeof window === "undefined" || typeof MessageChannel !== "function") {
  var l = null;
  var c = null;
  function p() {
    if (l !== null) {
      try {
        var e = exports.unstable_now();
        l(true, e);
        l = null;
      } catch (r) {
        setTimeout(p, 0);
        throw r;
      }
    }
  }
  r = function (e) {
    if (l !== null) {
      setTimeout(r, 0, e);
    } else {
      l = e;
      setTimeout(p, 0);
    }
  };
  n = function (e, t) {
    c = setTimeout(e, t);
  };
  i = function () {
    clearTimeout(c);
  };
  exports.unstable_shouldYield = function () {
    return false;
  };
  o = exports.unstable_forceFrameRate = function () {};
} else {
  var d = window.setTimeout;
  var f = window.clearTimeout;
  if (typeof console !== "undefined") {
    var g = window.cancelAnimationFrame;
    if (typeof window.requestAnimationFrame !== "function") {
      console.error("This browser doesn't support requestAnimationFrame. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills");
    }
    if (typeof g !== "function") {
      console.error("This browser doesn't support cancelAnimationFrame. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills");
    }
  }
  var m = false;
  var v = null;
  var y = -1;
  var h = 5;
  var b = 0;
  exports.unstable_shouldYield = function () {
    return exports.unstable_now() >= b;
  };
  o = function () {};
  exports.unstable_forceFrameRate = function (e) {
    if (e < 0 || e > 125) {
      console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported");
    } else {
      h = e > 0 ? Math.floor(1000 / e) : 5;
    }
  };
  var w = new MessageChannel();
  var x = w.port2;
  w.port1.onmessage = function () {
    if (v !== null) {
      var e = exports.unstable_now();
      b = e + h;
      try {
        if (v(true, e)) {
          x.postMessage(null);
        } else {
          m = false;
          v = null;
        }
      } catch (r) {
        x.postMessage(null);
        throw r;
      }
    } else {
      m = false;
    }
  };
  r = function (e) {
    v = e;
    if (!m) {
      m = true;
      x.postMessage(null);
    }
  };
  n = function (e, r) {
    y = d(function () {
      e(exports.unstable_now());
    }, r);
  };
  i = function () {
    f(y);
    y = -1;
  };
}
function E(e, t) {
  var r = e.length;
  e.push(t);
  e: while (true) {
    var n = r - 1 >>> 1;
    var i = e[n];
    if (i === undefined || !(T(i, t) > 0)) {
      break e;
    }
    e[n] = t;
    e[r] = i;
    r = n;
  }
}
function k(e) {
  e = e[0];
  if (e === undefined) {
    return null;
  } else {
    return e;
  }
}
function S(e) {
  var t = e[0];
  if (t !== undefined) {
    var r = e.pop();
    if (r !== t) {
      e[0] = r;
      e: for (var n = 0, i = e.length; n < i;) {
        var o = (n + 1) * 2 - 1;
        var a = e[o];
        var s = o + 1;
        var u = e[s];
        if (a !== undefined && T(a, r) < 0) {
          if (u !== undefined && T(u, a) < 0) {
            e[n] = u;
            e[s] = r;
            n = s;
          } else {
            e[n] = a;
            e[o] = r;
            n = o;
          }
        } else {
          if (u === undefined || !(T(u, r) < 0)) {
            break e;
          }
          e[n] = u;
          e[s] = r;
          n = s;
        }
      }
    }
    return t;
  }
  return null;
}
function T(e, t) {
  var r = e.sortIndex - t.sortIndex;
  if (r !== 0) {
    return r;
  } else {
    return e.id - t.id;
  }
}
var C = [];
var A = [];
var _ = 1;
var O = null;
var M = 3;
var P = false;
var q = false;
var N = false;
function R(e) {
  for (var t = k(A); t !== null;) {
    if (t.callback === null) {
      S(A);
    } else {
      if (!(t.startTime <= e)) {
        break;
      }
      S(A);
      t.sortIndex = t.expirationTime;
      E(C, t);
    }
    t = k(A);
  }
}
function I(e) {
  N = false;
  R(e);
  if (!q) {
    if (k(C) !== null) {
      q = true;
      r(j);
    } else {
      var t = k(A);
      if (t !== null) {
        n(I, t.startTime - e);
      }
    }
  }
}
function j(e, r) {
  q = false;
  if (N) {
    N = false;
    i();
  }
  P = true;
  var o = M;
  try {
    R(r);
    O = k(C);
    while (O !== null && (!(O.expirationTime > r) || e && !exports.unstable_shouldYield())) {
      var a = O.callback;
      if (typeof a === "function") {
        O.callback = null;
        M = O.priorityLevel;
        var s = a(O.expirationTime <= r);
        r = exports.unstable_now();
        if (typeof s === "function") {
          O.callback = s;
        } else if (O === k(C)) {
          S(C);
        }
        R(r);
      } else {
        S(C);
      }
      O = k(C);
    }
    if (O !== null) {
      var u = true;
    } else {
      var l = k(A);
      if (l !== null) {
        n(I, l.startTime - r);
      }
      u = false;
    }
    return u;
  } finally {
    O = null;
    M = o;
    P = false;
  }
}
var D = o;
exports.unstable_IdlePriority = 5;
exports.unstable_ImmediatePriority = 1;
exports.unstable_LowPriority = 4;
exports.unstable_NormalPriority = 3;
exports.unstable_Profiling = null;
exports.unstable_UserBlockingPriority = 2;
exports.unstable_cancelCallback = function (e) {
  e.callback = null;
};
exports.unstable_continueExecution = function () {
  if (!q && !P) {
    q = true;
    r(j);
  }
};
exports.unstable_getCurrentPriorityLevel = function () {
  return M;
};
exports.unstable_getFirstCallbackNode = function () {
  return k(C);
};
exports.unstable_next = function (e) {
  switch (M) {
    case 1:
    case 2:
    case 3:
      var t = 3;
      break;
    default:
      t = M;
  }
  var r = M;
  M = t;
  try {
    return e();
  } finally {
    M = r;
  }
};
exports.unstable_pauseExecution = function () {};
exports.unstable_requestPaint = D;
exports.unstable_runWithPriority = function (e, t) {
  switch (e) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      break;
    default:
      e = 3;
  }
  var r = M;
  M = e;
  try {
    return t();
  } finally {
    M = r;
  }
};
exports.unstable_scheduleCallback = function (e, o, a) {
  var s = exports.unstable_now();
  if (typeof a === "object" && a !== null) {
    a = a.delay;
    a = typeof a === "number" && a > 0 ? s + a : s;
  } else {
    a = s;
  }
  switch (e) {
    case 1:
      var u = -1;
      break;
    case 2:
      u = 250;
      break;
    case 5:
      u = 1073741823;
      break;
    case 4:
      u = 10000;
      break;
    default:
      u = 5000;
  }
  u = a + u;
  e = {
    id: _++,
    callback: o,
    priorityLevel: e,
    startTime: a,
    expirationTime: u,
    sortIndex: -1
  };
  if (a > s) {
    e.sortIndex = a;
    E(A, e);
    if (k(C) === null && e === k(A)) {
      if (N) {
        i();
      } else {
        N = true;
      }
      n(I, a - s);
    }
  } else {
    e.sortIndex = u;
    E(C, e);
    if (!q && !P) {
      q = true;
      r(j);
    }
  }
  return e;
};
exports.unstable_wrapCallback = function (e) {
  var t = M;
  return function () {
    var r = M;
    M = t;
    try {
      return e.apply(this, arguments);
    } finally {
      M = r;
    }
  };
};
};
