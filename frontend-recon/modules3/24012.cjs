// webpack module 24012 — body from webcrack
module.exports = function (module, exports, require) {
var n;
var i = require("./8733.js");
var o = require("./92695.js");
var a = require("./55477.js");
var s = require("./5659.js");
var u = require("./15595.js");
var l = require("./6924.js");
var c = require("./52141.js");
var p = require("./41216.js");
var d = require("./75386.js").f;
var f = require("./54295.js");
var g = require("./82369.js");
var m = require("./55878.js");
var v = require("./22319.js");
var y = a.Int8Array;
var h = y && y.prototype;
var b = a.Uint8ClampedArray;
var w = b && b.prototype;
var x = y && f(y);
var E = h && f(h);
var k = Object.prototype;
var S = k.isPrototypeOf;
var T = m("toStringTag");
var C = v("TYPED_ARRAY_TAG");
var A = i && !!g && l(a.opera) !== "Opera";
var _ = false;
var O = {
  Int8Array: 1,
  Uint8Array: 1,
  Uint8ClampedArray: 1,
  Int16Array: 2,
  Uint16Array: 2,
  Int32Array: 4,
  Uint32Array: 4,
  Float32Array: 4,
  Float64Array: 8
};
function M(e) {
  var t = l(e);
  return t === "DataView" || u(O, t);
}
function P(e) {
  return s(e) && u(O, l(e));
}
function q(e) {
  if (P(e)) {
    return e;
  }
  throw TypeError("Target is not a typed array");
}
function N(e) {
  if (g) {
    if (S.call(x, e)) {
      return e;
    }
  } else {
    for (var t in O) {
      if (u(O, n)) {
        var r = a[t];
        if (r && (e === r || S.call(r, e))) {
          return e;
        }
      }
    }
  }
  throw TypeError("Target is not a typed array constructor");
}
function R(e, t, r) {
  if (o) {
    if (r) {
      for (var n in O) {
        var i = a[n];
        if (i && u(i.prototype, e)) {
          delete i.prototype[e];
        }
      }
    }
    if (!E[e] || !!r) {
      p(E, e, r ? t : A && h[e] || t);
    }
  }
}
function I(e, t, r) {
  var n;
  var i;
  if (o) {
    if (g) {
      if (r) {
        for (n in O) {
          i = a[n];
          if (i && u(i, e)) {
            delete i[e];
          }
        }
      }
      if (x[e] && !r) {
        return;
      }
      try {
        return p(x, e, r ? t : A && y[e] || t);
      } catch (s) {}
    }
    for (n in O) {
      i = a[n];
      if (!!i && (!i[e] || !!r)) {
        p(i, e, t);
      }
    }
  }
}
for (n in O) {
  if (!a[n]) {
    A = false;
  }
}
if ((!A || typeof x != "function" || x === Function.prototype) && (x = function () {
  throw TypeError("Incorrect invocation");
}, A)) {
  for (n in O) {
    if (a[n]) {
      g(a[n], x);
    }
  }
}
if ((!A || !E || E === k) && (E = x.prototype, A)) {
  for (n in O) {
    if (a[n]) {
      g(a[n].prototype, E);
    }
  }
}
if (A && f(w) !== E) {
  g(w, E);
}
if (o && !u(E, T)) {
  _ = true;
  d(E, T, {
    get: function () {
      if (s(this)) {
        return this[C];
      } else {
        return undefined;
      }
    }
  });
  for (n in O) {
    if (a[n]) {
      c(a[n], C, n);
    }
  }
}
module.exports = {
  NATIVE_ARRAY_BUFFER_VIEWS: A,
  TYPED_ARRAY_TAG: _ && C,
  aTypedArray: q,
  aTypedArrayConstructor: N,
  exportTypedArrayMethod: R,
  exportTypedArrayStaticMethod: I,
  isView: M,
  isTypedArray: P,
  TypedArray: x,
  TypedArrayPrototype: E
};
};
