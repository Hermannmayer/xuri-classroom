// webpack module 87183 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  fX: function () {
    return it;
  },
  aD: function () {
    return Ze;
  },
  EH: function () {
    return rt;
  },
  dC: function () {
    return Fe;
  },
  r3: function () {
    return be;
  },
  Ou: function () {
    return et;
  },
  WV: function () {
    return we;
  },
  bi: function () {
    return ge;
  },
  LO: function () {
    return Xe;
  },
  N7: function () {
    return ot;
  },
  U5: function () {
    return nt;
  },
  ZN: function () {
    return he;
  },
  rg: function () {
    return ze;
  }
});
var n;
var i = Object.prototype.toString;
function o(e) {
  return e && e instanceof Map;
}
function a(e) {
  return e && e instanceof Set;
}
function s(e) {
  return e && e instanceof WeakMap;
}
function u(e) {
  return e && e instanceof WeakSet;
}
function l(e) {
  return typeof e === "function";
}
var c = Array.isArray;
function p(e) {
  return i.call(e) === "[object Object]";
}
function d(e) {
  return e !== null && e !== undefined;
}
function f(e) {
  return o(e) || s(e) || a(e) || u(e);
}
function g(e) {
  return p(e) || c(e);
}
function m(e) {
  if (Array.isArray(e)) {
    return e;
  } else if (e !== undefined && e !== null) {
    return [e];
  } else {
    return [];
  }
}
var v = function () {
  function e(e = []) {
    this.forEachIndex = 0;
    this.value = e;
  }
  e.prototype.add = function (e) {
    if (!this.has(e)) {
      this.value.push(e);
    }
  };
  e.prototype.has = function (e) {
    return this.value.indexOf(e) > -1;
  };
  e.prototype.delete = function (e) {
    var t = this.value.length;
    if (t !== 0) {
      if (t !== 1 || this.value[0] !== e) {
        var r = this.value.indexOf(e);
        if (r > -1) {
          this.value.splice(r, 1);
          if (r <= this.forEachIndex) {
            this.forEachIndex -= 1;
          }
        }
      } else {
        this.value = [];
      }
    }
  };
  e.prototype.forEach = function (e) {
    if (this.value.length !== 0) {
      for (this.forEachIndex = 0; this.forEachIndex < this.value.length; this.forEachIndex++) {
        e(this.value[this.forEachIndex]);
      }
    }
  };
  e.prototype.batchDelete = function (e) {
    if (this.value.length !== 0) {
      for (this.forEachIndex = 0; this.forEachIndex < this.value.length; this.forEachIndex++) {
        var t = this.value[this.forEachIndex];
        this.value.splice(this.forEachIndex, 1);
        this.forEachIndex--;
        e(t);
      }
    }
  };
  e.prototype.clear = function () {
    this.value.length = 0;
  };
  return e;
}();
var y = new WeakMap();
var h = new WeakMap();
var b = new WeakMap();
var w = new WeakMap();
var x = new WeakMap();
var E = [];
var k = {
  value: 0
};
var S = {
  value: 0
};
var T = {
  value: false
};
var C = {
  value: false
};
var A = new v();
var _ = new v();
var O = new v();
var M = new v();
var P = Symbol("MakeObModelSymbol");
var q = Symbol("ObModelSymbol");
var N = Symbol("ObModelNodeSymbol");
var R = Symbol("iteration key");
function I(e, t, r) {
  var n = x.get(e);
  if (n) {
    var i = n.get(t);
    if (i) {
      i.add(r);
    } else {
      n.set(t, new v([r]));
    }
    return n;
  }
  var o = new Map([[t, new v([r])]]);
  x.set(e, o);
  return o;
}
function j(e, t) {
  var r = e._reactionsSet;
  if (r) {
    r.add(t);
  } else {
    e._reactionsSet = new v([t]);
  }
  return r;
}
function D(e, t) {
  var r = x.get(e);
  var n = [];
  if (r) {
    var i = r.get(t);
    if (i) {
      i.forEach(function (e) {
        if (n.indexOf(e) === -1) {
          n.push(e);
        }
      });
    }
  }
  return n;
}
function L(e, t) {
  var r = D(e, t);
  var n = S.value;
  S.value = 0;
  for (var i = 0, o = r.length; i < o; i++) {
    var a = r[i];
    if (a._isComputed) {
      a._scheduler(a);
    } else if (ee()) {
      _.add(a);
    } else if (X()) {
      A.add(a);
    } else if (l(a._scheduler)) {
      a._scheduler(a);
    } else {
      a();
    }
  }
  S.value = n;
}
function F(e) {
  M.forEach(function (t) {
    return t(e);
  });
}
function Z(e) {
  var t = e.key;
  var r = e.type;
  var n = e.target;
  if (r === "iterate") {
    t = R;
  }
  var i = E.length;
  if (i !== 0) {
    var o = E[i - 1];
    if (!te()) {
      if (o) {
        C.value = true;
        j(o, I(n, t, o));
      }
    }
  }
}
function z(e) {
  if (l(e)) {
    var t = E[E.length - 1];
    if (t) {
      var r = t._computesSet;
      if (r) {
        r.add(e);
      } else {
        t._computesSet = new v([e]);
      }
    }
  }
}
function U(e) {
  var t = e.key;
  var r = e.type;
  var n = e.target;
  var i = e.oldTarget;
  Y();
  F(e);
  if (r === "clear") {
    i.forEach(function (e, t) {
      L(n, t);
    });
  } else {
    L(n, t);
  }
  if (r === "add" || r === "delete" || r === "clear") {
    var o = Array.isArray(n) ? "length" : R;
    L(n, o);
  }
  Q();
}
function B() {
  return E.length > 0;
}
function V(e) {
  var t;
  if ((t = e._reactionsSet) !== null && t !== undefined) {
    t.forEach(function (t) {
      t.forEach(function (t) {
        t.delete(e);
      });
    });
  }
  A.delete(e);
  _.delete(e);
  delete e._reactionsSet;
}
function H(e) {
  var t;
  if ((t = e._computesSet) !== null && t !== undefined) {
    t.forEach(function (e) {
      var t = D(e._context, e._property);
      if (t.length === 0) {
        W(e);
        e._dirty = true;
      }
    });
  }
}
function W(e) {
  e._disposed = true;
  V(e);
  H(e);
}
function Y() {
  k.value++;
}
function Q() {
  k.value--;
  if (k.value === 0) {
    var e = S.value;
    S.value = 0;
    re();
    ne();
    S.value = e;
  }
}
function $() {
  T.value = true;
}
function G() {
  var e = S.value;
  T.value = false;
  S.value = 0;
  _.batchDelete(function (e) {
    if (l(e._scheduler)) {
      e._scheduler(e);
    } else {
      e();
    }
  });
  S.value = e;
}
function K() {
  S.value++;
}
function J() {
  S.value--;
}
function X() {
  return k.value > 0;
}
function ee() {
  return T.value;
}
function te() {
  return S.value > 0;
}
function re() {
  A.batchDelete(function (e) {
    if (l(e._scheduler)) {
      e._scheduler(e);
    } else {
      e();
    }
  });
}
function ne() {
  O.batchDelete(function (e) {
    e();
  });
}
function ie(e, t) {
  return e !== t && (e.length !== t.length || !!e.some(function (e, r) {
    return e !== t[r];
  }));
}
function oe(e) {
  if (e._effects) {
    try {
      Y();
      e._effects.queue.forEach(function (e) {
        if (e && e.dispose) {
          e.dispose();
        }
      });
    } finally {
      Q();
    }
  }
}
var ae = function () {
  function e(e, t) {
    this.node = t;
    this.key = e.key;
    this.type = e.type;
    this.object = e.target;
    this.value = e.value;
    this.oldValue = e.oldValue;
  }
  Object.defineProperty(e.prototype, "path", {
    get: function () {
      return this.node.path.concat(this.key);
    },
    enumerable: false,
    configurable: true
  });
  return e;
}();
var se = function () {
  function e(e, t, r) {
    this.target = e;
    this.key = t;
    this.value = r;
  }
  Object.defineProperty(e.prototype, "path", {
    get: function () {
      if (this.parent) {
        return this.parent.path.concat(this.key);
      } else if (this.key) {
        return [this.key];
      } else {
        return [];
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "targetRaw", {
    get: function () {
      return ye(this.target);
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "parent", {
    get: function () {
      if (this.target) {
        return ue(this.targetRaw);
      }
    },
    enumerable: false,
    configurable: true
  });
  e.prototype.isEqual = function (e) {
    if (this.key) {
      return e.targetRaw === this.targetRaw && e.key === this.key;
    } else {
      return e.value === this.value;
    }
  };
  e.prototype.contains = function (e) {
    if (e === this) {
      return true;
    }
    var t = e.parent;
    while (t) {
      if (this.isEqual(t)) {
        return true;
      }
      t = t.parent;
    }
    return false;
  };
  return e;
}();
function ue(e) {
  if (e?.[N]) {
    return e[N];
  } else {
    return w.get(e);
  }
}
function le(e, t) {
  if (e?.[q]) {
    e[N] = t;
  } else {
    w.set(e, t);
  }
}
function ce(e, t, r) {
  var n = ye(r);
  var i = ue(n);
  if (i) {
    return i;
  }
  le(n, new se(e, t, r));
}
var pe = Symbol("RAW_TYPE");
var de = Symbol("OBSERVABLE_TYPE");
var fe = Object.prototype.hasOwnProperty;
function ge(e) {
  return y.has(e) || !!e?.[q];
}
function me(e) {
  return e && !!e[P];
}
function ve(e) {
  return !!d(e) && (!!c(e) || (p(e) ? !e[pe] && (!!e[de] || (!("$$typeof" in e) || !("_owner" in e)) && !e._isAMomentObject && !e._isJSONSchemaObject && !l(e.toJS) && !l(e.toJSON)) : !!o(e) || !!s(e) || !!a(e) || !!u(e)));
}
function ye(e) {
  if (e?.[q]) {
    return e[q];
  } else {
    return y.get(e) || e;
  }
}
function he(e) {
  var t = new WeakSet();
  function r(e) {
    if (t.has(e)) {
      return e;
    }
    if (e && e[pe]) {
      return e;
    }
    if (c(e)) {
      if (ge(e)) {
        t.add(e);
        var n = [];
        e.forEach(function (e) {
          n.push(r(e));
        });
        t.delete(e);
        return n;
      }
    } else if (p(e) && ge(e)) {
      t.add(e);
      var i = {};
      for (var o in e) {
        if (fe.call(e, o)) {
          i[o] = r(e[o]);
        }
      }
      t.delete(e);
      return i;
    }
    return e;
  }
  return r(e);
}
function be(e, t) {
  var r = ye(e);
  var n = ye(t);
  if (r === n) {
    return true;
  }
  var i = ue(r);
  var o = ue(n);
  return !!i && !!o && i.contains(o);
}
function we(e) {
  C.value = false;
  if (e !== null && e !== undefined) {
    e();
  }
  return C.value;
}
function xe(e, t) {
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
function Ee(e, t, r) {
  if (r || arguments.length === 2) {
    var n;
    for (var i = 0, o = t.length; i < o; i++) {
      if (!!n || !(i in t)) {
        n ||= Array.prototype.slice.call(t, 0, i);
        n[i] = t[i];
      }
    }
  }
  return e.concat(n || Array.prototype.slice.call(t));
}
var ke = new Set(Object.getOwnPropertyNames(Symbol).reduce(function (e, t) {
  if (t === "arguments" || t === "caller") {
    return e;
  }
  var r = Symbol[t];
  if (typeof r === "symbol") {
    return e.concat(r);
  } else {
    return e;
  }
}, []));
var Se = Object.prototype.hasOwnProperty;
function Te(e, t, r) {
  var n = h.get(r);
  return n || (!ge(r) && ve(r) ? Ne(e, t, r) : r);
}
function Ce(e, t, r, n) {
  var i = r.next;
  r.next = function () {
    var o = i.call(r);
    var a = o.done;
    var s = o.value;
    if (!a) {
      if (n) {
        s[1] = Te(e, t, s[1]);
      } else {
        s = Te(e, t, s);
      }
    }
    return {
      done: a,
      value: s
    };
  };
  return r;
}
n = {
  has: function (e) {
    var t = y.get(this);
    var r = Reflect.getPrototypeOf(this);
    Z({
      target: t,
      key: e,
      type: "has"
    });
    return r.has.apply(t, arguments);
  },
  get: function (e) {
    var t = y.get(this);
    var r = Reflect.getPrototypeOf(this);
    Z({
      target: t,
      key: e,
      type: "get"
    });
    return Te(t, e, r.get.apply(t, arguments));
  },
  add: function (e) {
    var t = y.get(this);
    var r = Reflect.getPrototypeOf(this);
    var n = r.has.call(t, e);
    var i = r.add.apply(t, arguments);
    if (!n) {
      U({
        target: t,
        key: e,
        value: e,
        type: "add"
      });
    }
    return i;
  },
  set: function (e, t) {
    var r = y.get(this);
    var n = Reflect.getPrototypeOf(this);
    var i = n.has.call(r, e);
    var o = n.get.call(r, e);
    var a = n.set.apply(r, arguments);
    if (i) {
      if (t !== o) {
        U({
          target: r,
          key: e,
          value: t,
          oldValue: o,
          type: "set"
        });
      }
    } else {
      U({
        target: r,
        key: e,
        value: t,
        type: "add"
      });
    }
    return a;
  },
  delete: function (e) {
    var t = y.get(this);
    var r = Reflect.getPrototypeOf(this);
    var n = r.has.call(t, e);
    var i = r.get ? r.get.call(t, e) : undefined;
    var o = r.delete.apply(t, arguments);
    if (n) {
      U({
        target: t,
        key: e,
        oldValue: i,
        type: "delete"
      });
    }
    return o;
  },
  clear: function () {
    var e = y.get(this);
    var t = Reflect.getPrototypeOf(this);
    var r = e.size !== 0;
    var n = e instanceof Map ? new Map(e) : new Set(e);
    var i = t.clear.apply(e, arguments);
    if (r) {
      U({
        target: e,
        oldTarget: n,
        type: "clear"
      });
    }
    return i;
  },
  forEach: function (e) {
    var t;
    var r = [];
    for (var n = 1; n < arguments.length; n++) {
      r[n - 1] = arguments[n];
    }
    var i = y.get(this);
    var o = Reflect.getPrototypeOf(this);
    Z({
      target: i,
      type: "iterate"
    });
    function a(t, r) {
      var n = [];
      for (var o = 2; o < arguments.length; o++) {
        n[o - 2] = arguments[o];
      }
      return e.apply(undefined, Ee([Te(i, r, t), r], xe(n), false));
    }
    return (t = o.forEach).call.apply(t, Ee([i, a], xe(r), false));
  },
  keys: function () {
    var e = y.get(this);
    var t = Reflect.getPrototypeOf(this);
    Z({
      target: e,
      type: "iterate"
    });
    return t.keys.apply(e, arguments);
  },
  values: function () {
    var e = y.get(this);
    var t = Reflect.getPrototypeOf(this);
    Z({
      target: e,
      type: "iterate"
    });
    var r = t.values.apply(e, arguments);
    return Ce(e, "", r, false);
  },
  entries: function () {
    var e = y.get(this);
    var t = Reflect.getPrototypeOf(this);
    Z({
      target: e,
      type: "iterate"
    });
    var r = t.entries.apply(e, arguments);
    return Ce(e, "", r, true);
  }
};
n[Symbol.iterator] = function () {
  var e = y.get(this);
  var t = Reflect.getPrototypeOf(this);
  Z({
    target: e,
    type: "iterate"
  });
  var r = t[Symbol.iterator].apply(e, arguments);
  return Ce(e, "", r, e instanceof Map);
};
Object.defineProperty(n, "size", {
  get: function () {
    var e = y.get(this);
    var t = Reflect.getPrototypeOf(this);
    Z({
      target: e,
      type: "iterate"
    });
    return Reflect.get(t, "size", e);
  },
  enumerable: false,
  configurable: true
});
var Ae = n;
var _e = {
  get: function (e, t, r) {
    e = Se.call(Ae, t) ? Ae : e;
    return Reflect.get(e, t, r);
  }
};
var Oe = {
  get: function (e, t, r) {
    if (t) {
      var n = e[t];
      if (typeof t === "symbol" && ke.has(t)) {
        return n;
      }
      Z({
        target: e,
        key: t,
        receiver: r,
        type: "get"
      });
      var i = h.get(n);
      if (i) {
        return i;
      }
      if (!ge(n) && ve(n)) {
        var o = Reflect.getOwnPropertyDescriptor(e, t);
        if (!o || o.writable !== false || o.configurable !== false) {
          return Ne(e, t, n);
        }
      }
      return n;
    }
  },
  has: function (e, t) {
    var r = Reflect.has(e, t);
    Z({
      target: e,
      key: t,
      type: "has"
    });
    return r;
  },
  ownKeys: function (e) {
    var t = Reflect.ownKeys(e);
    Z({
      target: e,
      type: "iterate"
    });
    return t;
  },
  set: function (e, t, r, n) {
    if (t === "__proto__") {
      e[t] = r;
      return true;
    }
    var i = Se.call(e, t);
    var o = Ne(e, t, r);
    var a = e[t];
    e[t] = o;
    if (i) {
      if (r !== a) {
        U({
          target: e,
          key: t,
          value: o,
          oldValue: a,
          receiver: n,
          type: "set"
        });
      }
    } else {
      U({
        target: e,
        key: t,
        value: o,
        oldValue: a,
        receiver: n,
        type: "add"
      });
    }
    return true;
  },
  deleteProperty: function (e, t) {
    var r = e[t];
    delete e[t];
    U({
      target: e,
      key: t,
      oldValue: r,
      type: "delete"
    });
    return true;
  }
};
function Me(e, t) {
  var r = new Proxy(e, Oe);
  y.set(r, e);
  if (t) {
    b.set(e, r);
  } else {
    h.set(e, r);
  }
  return r;
}
function Pe(e, t) {
  var r = new Proxy(e, _e);
  y.set(r, e);
  if (t) {
    b.set(e, r);
  } else {
    h.set(e, r);
  }
  return r;
}
function qe(e) {
  if (g(e)) {
    return Me(e, true);
  } else if (f(e)) {
    return Pe(e, true);
  } else {
    return e;
  }
}
function Ne(e, t, r, n) {
  if (typeof r !== "object") {
    return r;
  }
  var i = y.get(r);
  if (i) {
    var o = ue(i);
    o.target ||= e;
    o.key = t;
    return r;
  }
  if (!ve(r)) {
    return r;
  }
  if (e) {
    var a = y.get(e) || e;
    var s = b.get(a);
    if (s) {
      return r;
    }
  }
  ce(e, t, r);
  if (n) {
    return qe(r);
  } else if (g(r)) {
    return Me(r);
  } else if (f(r)) {
    return Pe(r);
  } else {
    return r;
  }
}
function Re(e) {
  function t(t) {
    return e({
      value: t
    });
  }
  if (l(e)) {
    t[P] = e;
  }
  return t;
}
function Ie(e) {
  if (e[P]) {
    if (e[P][P]) {
      return Ie(e[P]);
    } else {
      return e[P];
    }
  }
}
function je(e, t) {
  function r(r) {
    var n;
    try {
      e();
      if (l(r)) {
        n = r();
      }
    } finally {
      t();
    }
    return n;
  }
  r.bound = De(r);
  return r;
}
function De(e) {
  function t(t, r) {
    return function () {
      var n = [];
      for (var i = 0; i < arguments.length; i++) {
        n[i] = arguments[i];
      }
      return e(function () {
        return t.apply(r, n);
      });
    };
  }
  return t;
}
function Le(e, t) {
  var r = je(e, t);
  var n = Re(function (e) {
    var t = e.target;
    var n = e.key;
    t[n] = r.bound(t[n], t);
    return t;
  });
  r[P] = n;
  r.bound[P] = n;
  return r;
}
var Fe = Le(Y, Q);
Fe.scope = Le($, G);
Fe.endpoint = function (e) {
  if (l(e)) {
    if (k.value === 0) {
      e();
    } else {
      O.add(e);
    }
  }
};
var Ze = Le(function () {
  Y();
  K();
}, function () {
  J();
  Q();
});
Ze.scope = Le(function () {
  $();
  K();
}, function () {
  J();
  G();
});
var ze = je(K, J);
var Ue = Re(function (e) {
  var t = e.target;
  var r = e.key;
  var n = e.value;
  var i = {
    value: Ne(t, r, t ? t[r] : n)
  };
  function o() {
    Z({
      target: t,
      key: r,
      type: "get"
    });
    return i.value;
  }
  function a(e) {
    var n = i.value;
    e = Ne(t, r, e);
    i.value = e;
    if (n !== e) {
      U({
        target: t,
        key: r,
        type: "set",
        oldValue: n,
        value: e
      });
    }
  }
  if (t) {
    Object.defineProperty(t, r, {
      set: a,
      get: o,
      enumerable: true,
      configurable: false
    });
    return t;
  } else {
    return i.value;
  }
});
var Be = Re(function (e) {
  var t = e.target;
  var r = e.key;
  var n = e.value;
  var i = {
    value: t ? t[r] : n
  };
  var o = {
    set: s,
    get: a
  };
  function a() {
    Z({
      target: i,
      key: r,
      type: "get"
    });
    return i.value;
  }
  function s(e) {
    var t = i.value;
    i.value = e;
    if (t !== e) {
      U({
        target: i,
        key: r,
        type: "set",
        oldValue: t,
        value: e
      });
    }
  }
  y.set(o, i);
  h.set(i, o);
  ce(t, r, i);
  if (t) {
    Object.defineProperty(t, r, {
      value: o,
      enumerable: true,
      configurable: false,
      writable: false
    });
    return t;
  } else {
    return o;
  }
});
var Ve = Re(function (e) {
  var t = e.target;
  var r = e.key;
  var n = e.value;
  var i = {
    value: t ? t[r] : n
  };
  var o = {};
  var a = t || i;
  var s = t ? r : "value";
  function u() {
    Z({
      target: a,
      key: s,
      type: "get"
    });
    return i.value;
  }
  function l(e) {
    var t = i.value;
    i.value = e;
    if (t !== e) {
      U({
        target: a,
        key: s,
        type: "set",
        oldValue: t,
        value: e
      });
    }
  }
  if (t) {
    Object.defineProperty(t, r, {
      get: u,
      set: l,
      enumerable: true
    });
    return t;
  } else {
    Object.defineProperty(o, "value", {
      set: l,
      get: u
    });
    ce(t, r, i);
    o[q] = i;
    return o;
  }
});
var He = Re(function (e) {
  var t = e.target;
  var r = e.key;
  var n = e.value;
  var i = {
    value: Ne(t, r, t ? t[r] : n, true)
  };
  function o() {
    Z({
      target: t,
      key: r,
      type: "get"
    });
    return i.value;
  }
  function a(e) {
    var n = i.value;
    e = Ne(t, r, e, true);
    i.value = e;
    if (n !== e) {
      U({
        target: t,
        key: r,
        type: "set",
        oldValue: n,
        value: e
      });
    }
  }
  if (t) {
    Object.defineProperty(t, r, {
      set: a,
      get: o,
      enumerable: true,
      configurable: false
    });
    return t;
  } else {
    return i.value;
  }
});
var We = Object.getOwnPropertyDescriptor;
var Ye = Object.getPrototypeOf;
var Qe = Symbol("ClassDescriptorSymbol");
function $e(e, t) {
  if (e) {
    return We(e, t) || $e(Ye(e), t);
  }
}
function Ge(e, t) {
  var r = e.constructor;
  if (r === Object || r === Array) {
    return $e(e, t);
  }
  var n = r[Qe] || {};
  var i = n[t];
  if (i) {
    return i;
  }
  var o = $e(e, t);
  r[Qe] = n;
  n[t] = o;
  return o;
}
function Ke(e, t, r) {
  if (!e) {
    if (r) {
      if (l(r)) {
        return {
          get: r
        };
      } else {
        return r;
      }
    } else {
      return {};
    }
  }
  var n = Ge(e, t);
  return n || {};
}
var Je = Re(function (e) {
  var t = e.target;
  var r = e.key;
  var n = e.value;
  var i = {};
  var o = {};
  var a = t || i;
  var s = t ? r : "value";
  var u = Ke(t, s, n);
  function l() {
    var e;
    i.value = (e = u.get) === null || e === undefined ? undefined : e.call(a);
  }
  function c() {
    if (E.indexOf(c) === -1) {
      V(c);
      try {
        E.push(c);
        l();
      } finally {
        E.pop();
      }
    }
  }
  function p() {
    if (B()) {
      z(c);
    }
    if (te()) {
      l();
    } else if (c._dirty) {
      c();
      c._dirty = false;
    }
    Z({
      target: a,
      key: s,
      type: "get"
    });
    return i.value;
  }
  function d(e) {
    var t;
    try {
      Y();
      if ((t = u.set) !== null && t !== undefined) {
        t.call(a, e);
      }
    } finally {
      Q();
    }
  }
  c._name = "ComputedReaction";
  c._scheduler = function () {
    c._dirty = true;
    U({
      target: a,
      key: s,
      value: i.value,
      type: "set"
    });
  };
  c._isComputed = true;
  c._dirty = true;
  c._context = a;
  c._property = s;
  if (t) {
    Object.defineProperty(t, r, {
      get: p,
      set: d,
      enumerable: true
    });
    return t;
  } else {
    Object.defineProperty(o, "value", {
      set: d,
      get: p
    });
    ce(t, r, i);
    o[q] = i;
    return o;
  }
});
function Xe(e) {
  return Ne(null, null, e);
}
function et(e, t) {
  if (ge(e)) {
    return e;
  }
  if (!ve(e)) {
    return e;
  }
  e[q] = e;
  ce(undefined, undefined, e);
  for (var r in t) {
    var n = t[r];
    if (me(n)) {
      Ie(n)({
        target: e,
        key: r
      });
    }
  }
  return e;
}
Xe.box = Be;
Xe.ref = Ve;
Xe.deep = Ue;
Xe.shallow = He;
Xe.computed = Je;
Xe[P] = Ue;
function tt() {
  tt = Object.assign || function (e) {
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
  return tt.apply(this, arguments);
}
function rt(e, t = "AutoRun") {
  function r() {
    if (l(e) && !(r._boundary > 0) && E.indexOf(r) === -1) {
      V(r);
      try {
        Y();
        E.push(r);
        e();
      } finally {
        E.pop();
        r._boundary++;
        Q();
        r._boundary = 0;
        r._memos.cursor = 0;
        r._effects.cursor = 0;
      }
    }
  }
  function n() {
    r._memos = {
      queue: [],
      cursor: 0
    };
    r._effects = {
      queue: [],
      cursor: 0
    };
  }
  r._boundary = 0;
  r._name = t;
  n();
  r();
  return function () {
    W(r);
    oe(r);
    n();
  };
}
rt.memo = function (e, t) {
  if (l(e)) {
    var r = E[E.length - 1];
    if (!r || !r._memos) {
      throw new Error("autorun.memo must used in autorun function body.");
    }
    var n = m(t || []);
    var i = r._memos.cursor++;
    var o = r._memos.queue[i];
    if (!o || ie(n, o.deps)) {
      var a = e();
      r._memos.queue[i] = {
        value: a,
        deps: n
      };
      return a;
    }
    return o.value;
  }
};
rt.effect = function (e, t) {
  if (l(e)) {
    var r = E[E.length - 1];
    if (!r || !r._effects) {
      throw new Error("autorun.effect must used in autorun function body.");
    }
    var n = r._effects;
    var i = m(t || [{}]);
    var o = n.cursor++;
    var a = n.queue[o];
    if (!a || !!ie(i, a.deps)) {
      Promise.resolve(0).then(function () {
        if (!r._disposed) {
          var t = e();
          if (l(t)) {
            n.queue[o].dispose = t;
          }
        }
      });
      n.queue[o] = {
        deps: i
      };
    }
  }
};
function nt(e, t, r) {
  var n = tt({
    name: "Reaction"
  }, r);
  var i = {};
  function o() {
    if (l(n.equals)) {
      return !n.equals(i.oldValue, i.currentValue);
    } else {
      return i.oldValue !== i.currentValue;
    }
  }
  function a() {
    try {
      Y();
      if (l(t)) {
        t(i.currentValue, i.oldValue);
      }
    } finally {
      Q();
    }
  }
  function s() {
    if (E.indexOf(s) === -1) {
      V(s);
      try {
        E.push(s);
        i.currentValue = e();
      } finally {
        E.pop();
      }
    }
  }
  s._scheduler = function (e) {
    e();
    if (o()) {
      a();
    }
    i.oldValue = i.currentValue;
  };
  s._name = n.name;
  s();
  i.oldValue = i.currentValue;
  if (n.fireImmediately) {
    a();
  }
  return function () {
    W(s);
  };
}
var it = function () {
  function e(e, t = "TrackerReaction") {
    var r = this;
    this.track = function (e) {
      if (!l(e)) {
        return r.results;
      }
      if (!(r.track._boundary > 0)) {
        if (E.indexOf(r.track) === -1) {
          V(r.track);
          try {
            Y();
            E.push(r.track);
            r.results = e();
          } finally {
            E.pop();
            r.track._boundary++;
            Q();
            r.track._boundary = 0;
          }
        }
        return r.results;
      }
    };
    this.dispose = function () {
      W(r.track);
    };
    this.track._scheduler = function (t) {
      if (r.track._boundary === 0) {
        r.dispose();
      }
      if (l(t)) {
        e(t);
      }
    };
    this.track._name = t;
    this.track._boundary = 0;
  }
  return e;
}();
function ot(e, t, r = true) {
  function n(e) {
    var n = ye(e);
    var i = ue(n);
    function o(e) {
      var n = ye(e.target);
      var o = ue(n);
      if (r && i.contains(o) || i === o || i.targetRaw === n && i.key === e.key) {
        t(new ae(e, o));
      }
    }
    if (i && l(t)) {
      M.add(o);
    }
    return function () {
      M.delete(o);
    };
  }
  if (e && typeof e !== "object") {
    throw Error(`Can not observe ${typeof e} type.`);
  }
  return n(e);
}
};
