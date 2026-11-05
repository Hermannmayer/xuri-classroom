// webpack module 72100 — body from webcrack
module.exports = function (module, exports, require) {
var t;
var r = typeof Reflect === "object" ? Reflect : null;
var n = r && typeof r.apply === "function" ? r.apply : function (e, t, r) {
  return Function.prototype.apply.call(e, t, r);
};
function i(e) {
  if (console && console.warn) {
    console.warn(e);
  }
}
t = r && typeof r.ownKeys === "function" ? r.ownKeys : Object.getOwnPropertySymbols ? function (e) {
  return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e));
} : function (e) {
  return Object.getOwnPropertyNames(e);
};
var o = Number.isNaN || function (e) {
  return e !== e;
};
function a() {
  a.init.call(this);
}
module.exports = a;
module.exports.once = h;
a.EventEmitter = a;
a.prototype._events = undefined;
a.prototype._eventsCount = 0;
a.prototype._maxListeners = undefined;
var s = 10;
function u(e) {
  if (typeof e !== "function") {
    throw new TypeError("The \"listener\" argument must be of type Function. Received type " + typeof e);
  }
}
function l(e) {
  if (e._maxListeners === undefined) {
    return a.defaultMaxListeners;
  } else {
    return e._maxListeners;
  }
}
function c(e, t, r, n) {
  var o;
  var a;
  var s;
  u(r);
  a = e._events;
  if (a === undefined) {
    a = e._events = Object.create(null);
    e._eventsCount = 0;
  } else {
    if (a.newListener !== undefined) {
      e.emit("newListener", t, r.listener ? r.listener : r);
      a = e._events;
    }
    s = a[t];
  }
  if (s === undefined) {
    s = a[t] = r;
    ++e._eventsCount;
  } else {
    if (typeof s === "function") {
      s = a[t] = n ? [r, s] : [s, r];
    } else if (n) {
      s.unshift(r);
    } else {
      s.push(r);
    }
    o = l(e);
    if (o > 0 && s.length > o && !s.warned) {
      s.warned = true;
      var c = new Error("Possible EventEmitter memory leak detected. " + s.length + " " + String(t) + " listeners added. Use emitter.setMaxListeners() to increase limit");
      c.name = "MaxListenersExceededWarning";
      c.emitter = e;
      c.type = t;
      c.count = s.length;
      i(c);
    }
  }
  return e;
}
function p() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0) {
      return this.listener.call(this.target);
    } else {
      return this.listener.apply(this.target, arguments);
    }
  }
}
function d(e, t, r) {
  var n = {
    fired: false,
    wrapFn: undefined,
    target: e,
    type: t,
    listener: r
  };
  var i = p.bind(n);
  i.listener = r;
  n.wrapFn = i;
  return i;
}
function f(e, t, r) {
  var n = e._events;
  if (n === undefined) {
    return [];
  }
  var i = n[t];
  if (i === undefined) {
    return [];
  } else if (typeof i === "function") {
    if (r) {
      return [i.listener || i];
    } else {
      return [i];
    }
  } else if (r) {
    return y(i);
  } else {
    return m(i, i.length);
  }
}
function g(e) {
  var t = this._events;
  if (t !== undefined) {
    var r = t[e];
    if (typeof r === "function") {
      return 1;
    }
    if (r !== undefined) {
      return r.length;
    }
  }
  return 0;
}
function m(e, t) {
  var r = new Array(t);
  for (var n = 0; n < t; ++n) {
    r[n] = e[n];
  }
  return r;
}
function v(e, t) {
  for (; t + 1 < e.length; t++) {
    e[t] = e[t + 1];
  }
  e.pop();
}
function y(e) {
  for (var t = new Array(e.length), r = 0; r < t.length; ++r) {
    t[r] = e[r].listener || e[r];
  }
  return t;
}
function h(e, t) {
  return new Promise(function (r, n) {
    function i(r) {
      e.removeListener(t, o);
      n(r);
    }
    function o() {
      if (typeof e.removeListener === "function") {
        e.removeListener("error", i);
      }
      r([].slice.call(arguments));
    }
    w(e, t, o, {
      once: true
    });
    if (t !== "error") {
      b(e, i, {
        once: true
      });
    }
  });
}
function b(e, t, r) {
  if (typeof e.on === "function") {
    w(e, "error", t, r);
  }
}
function w(e, t, r, n) {
  if (typeof e.on === "function") {
    if (n.once) {
      e.once(t, r);
    } else {
      e.on(t, r);
    }
  } else {
    if (typeof e.addEventListener !== "function") {
      throw new TypeError("The \"emitter\" argument must be of type EventEmitter. Received type " + typeof e);
    }
    e.addEventListener(t, function i(o) {
      if (n.once) {
        e.removeEventListener(t, i);
      }
      r(o);
    });
  }
}
Object.defineProperty(a, "defaultMaxListeners", {
  enumerable: true,
  get: function () {
    return s;
  },
  set: function (e) {
    if (typeof e !== "number" || e < 0 || o(e)) {
      throw new RangeError("The value of \"defaultMaxListeners\" is out of range. It must be a non-negative number. Received " + e + ".");
    }
    s = e;
  }
});
a.init = function () {
  if (this._events === undefined || this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }
  this._maxListeners = this._maxListeners || undefined;
};
a.prototype.setMaxListeners = function (e) {
  if (typeof e !== "number" || e < 0 || o(e)) {
    throw new RangeError("The value of \"n\" is out of range. It must be a non-negative number. Received " + e + ".");
  }
  this._maxListeners = e;
  return this;
};
a.prototype.getMaxListeners = function () {
  return l(this);
};
a.prototype.emit = function (e) {
  var t = [];
  for (var r = 1; r < arguments.length; r++) {
    t.push(arguments[r]);
  }
  var i = e === "error";
  var o = this._events;
  if (o !== undefined) {
    i = i && o.error === undefined;
  } else if (!i) {
    return false;
  }
  if (i) {
    var a;
    if (t.length > 0) {
      a = t[0];
    }
    if (a instanceof Error) {
      throw a;
    }
    var s = new Error("Unhandled error." + (a ? " (" + a.message + ")" : ""));
    s.context = a;
    throw s;
  }
  var u = o[e];
  if (u === undefined) {
    return false;
  }
  if (typeof u === "function") {
    n(u, this, t);
  } else {
    var l = u.length;
    var c = m(u, l);
    for (r = 0; r < l; ++r) {
      n(c[r], this, t);
    }
  }
  return true;
};
a.prototype.addListener = function (e, t) {
  return c(this, e, t, false);
};
a.prototype.on = a.prototype.addListener;
a.prototype.prependListener = function (e, t) {
  return c(this, e, t, true);
};
a.prototype.once = function (e, t) {
  u(t);
  this.on(e, d(this, e, t));
  return this;
};
a.prototype.prependOnceListener = function (e, t) {
  u(t);
  this.prependListener(e, d(this, e, t));
  return this;
};
a.prototype.removeListener = function (e, t) {
  var r;
  var n;
  var i;
  var o;
  var a;
  u(t);
  n = this._events;
  if (n === undefined) {
    return this;
  }
  r = n[e];
  if (r === undefined) {
    return this;
  }
  if (r === t || r.listener === t) {
    if (--this._eventsCount === 0) {
      this._events = Object.create(null);
    } else {
      delete n[e];
      if (n.removeListener) {
        this.emit("removeListener", e, r.listener || t);
      }
    }
  } else if (typeof r !== "function") {
    i = -1;
    o = r.length - 1;
    for (; o >= 0; o--) {
      if (r[o] === t || r[o].listener === t) {
        a = r[o].listener;
        i = o;
        break;
      }
    }
    if (i < 0) {
      return this;
    }
    if (i === 0) {
      r.shift();
    } else {
      v(r, i);
    }
    if (r.length === 1) {
      n[e] = r[0];
    }
    if (n.removeListener !== undefined) {
      this.emit("removeListener", e, a || t);
    }
  }
  return this;
};
a.prototype.off = a.prototype.removeListener;
a.prototype.removeAllListeners = function (e) {
  var t;
  var r;
  var n;
  r = this._events;
  if (r === undefined) {
    return this;
  }
  if (r.removeListener === undefined) {
    if (arguments.length === 0) {
      this._events = Object.create(null);
      this._eventsCount = 0;
    } else if (r[e] !== undefined) {
      if (--this._eventsCount === 0) {
        this._events = Object.create(null);
      } else {
        delete r[e];
      }
    }
    return this;
  }
  if (arguments.length === 0) {
    var i;
    var o = Object.keys(r);
    for (n = 0; n < o.length; ++n) {
      i = o[n];
      if (i !== "removeListener") {
        this.removeAllListeners(i);
      }
    }
    this.removeAllListeners("removeListener");
    this._events = Object.create(null);
    this._eventsCount = 0;
    return this;
  }
  t = r[e];
  if (typeof t === "function") {
    this.removeListener(e, t);
  } else if (t !== undefined) {
    for (n = t.length - 1; n >= 0; n--) {
      this.removeListener(e, t[n]);
    }
  }
  return this;
};
a.prototype.listeners = function (e) {
  return f(this, e, true);
};
a.prototype.rawListeners = function (e) {
  return f(this, e, false);
};
a.listenerCount = function (e, t) {
  if (typeof e.listenerCount === "function") {
    return e.listenerCount(t);
  } else {
    return g.call(e, t);
  }
};
a.prototype.listenerCount = g;
a.prototype.eventNames = function () {
  if (this._eventsCount > 0) {
    return t(this._events);
  } else {
    return [];
  }
};
};
