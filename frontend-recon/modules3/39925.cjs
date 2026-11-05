// webpack module 39925 — body from webcrack
module.exports = function (module, exports, require) {
var n;
var i = require("./44850.js");
var o = require("./46392.js");
var a = require("./56731.js");
var s = require("./33996.js");
var u = require("./90961.js");
var l = require("./75736.js");
var c = require("./29837.js");
var p = require("./37821.js");
var d = require("./59273.js");
var f = require("./82889.js");
var g = require("./80095.js");
var m = require("./67237.js");
var v = require("./42046.js");
var y = require("./38525.js");
var h = require("./52030.js");
var b = Function;
function w(e) {
  try {
    return b("\"use strict\"; return (" + e + ").constructor;")();
  } catch (t) {}
}
var x = require("./14355.js");
var E = require("./93006.js");
function k() {
  throw new c();
}
var S = x ? function () {
  try {
    return k;
  } catch (e) {
    try {
      return x(arguments, "callee").get;
    } catch (t) {
      return k;
    }
  }
}() : k;
var T = require("./22644.js")();
var C = require("./14765.js");
var A = require("./7032.js");
var _ = require("./63568.js");
var O = require("./89657.js");
var M = require("./91485.js");
var P = {};
var q = typeof Uint8Array !== "undefined" && C ? C(Uint8Array) : n;
var N = {
  __proto__: null,
  "%AggregateError%": typeof AggregateError === "undefined" ? n : AggregateError,
  "%Array%": Array,
  "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? n : ArrayBuffer,
  "%ArrayIteratorPrototype%": T && C ? C([][Symbol.iterator]()) : n,
  "%AsyncFromSyncIteratorPrototype%": n,
  "%AsyncFunction%": P,
  "%AsyncGenerator%": P,
  "%AsyncGeneratorFunction%": P,
  "%AsyncIteratorPrototype%": P,
  "%Atomics%": typeof Atomics === "undefined" ? n : Atomics,
  "%BigInt%": typeof BigInt === "undefined" ? n : BigInt,
  "%BigInt64Array%": typeof BigInt64Array === "undefined" ? n : BigInt64Array,
  "%BigUint64Array%": typeof BigUint64Array === "undefined" ? n : BigUint64Array,
  "%Boolean%": Boolean,
  "%DataView%": typeof DataView === "undefined" ? n : DataView,
  "%Date%": Date,
  "%decodeURI%": decodeURI,
  "%decodeURIComponent%": decodeURIComponent,
  "%encodeURI%": encodeURI,
  "%encodeURIComponent%": encodeURIComponent,
  "%Error%": o,
  "%eval%": eval,
  "%EvalError%": a,
  "%Float16Array%": typeof Float16Array === "undefined" ? n : Float16Array,
  "%Float32Array%": typeof Float32Array === "undefined" ? n : Float32Array,
  "%Float64Array%": typeof Float64Array === "undefined" ? n : Float64Array,
  "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? n : FinalizationRegistry,
  "%Function%": b,
  "%GeneratorFunction%": P,
  "%Int8Array%": typeof Int8Array === "undefined" ? n : Int8Array,
  "%Int16Array%": typeof Int16Array === "undefined" ? n : Int16Array,
  "%Int32Array%": typeof Int32Array === "undefined" ? n : Int32Array,
  "%isFinite%": isFinite,
  "%isNaN%": isNaN,
  "%IteratorPrototype%": T && C ? C(C([][Symbol.iterator]())) : n,
  "%JSON%": typeof JSON === "object" ? JSON : n,
  "%Map%": typeof Map === "undefined" ? n : Map,
  "%MapIteratorPrototype%": typeof Map !== "undefined" && T && C ? C(new Map()[Symbol.iterator]()) : n,
  "%Math%": Math,
  "%Number%": Number,
  "%Object%": i,
  "%Object.getOwnPropertyDescriptor%": x,
  "%parseFloat%": parseFloat,
  "%parseInt%": parseInt,
  "%Promise%": typeof Promise === "undefined" ? n : Promise,
  "%Proxy%": typeof Proxy === "undefined" ? n : Proxy,
  "%RangeError%": s,
  "%ReferenceError%": u,
  "%Reflect%": typeof Reflect === "undefined" ? n : Reflect,
  "%RegExp%": RegExp,
  "%Set%": typeof Set === "undefined" ? n : Set,
  "%SetIteratorPrototype%": typeof Set !== "undefined" && T && C ? C(new Set()[Symbol.iterator]()) : n,
  "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? n : SharedArrayBuffer,
  "%String%": String,
  "%StringIteratorPrototype%": T && C ? C(""[Symbol.iterator]()) : n,
  "%Symbol%": T ? Symbol : n,
  "%SyntaxError%": l,
  "%ThrowTypeError%": S,
  "%TypedArray%": q,
  "%TypeError%": c,
  "%Uint8Array%": typeof Uint8Array === "undefined" ? n : Uint8Array,
  "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? n : Uint8ClampedArray,
  "%Uint16Array%": typeof Uint16Array === "undefined" ? n : Uint16Array,
  "%Uint32Array%": typeof Uint32Array === "undefined" ? n : Uint32Array,
  "%URIError%": p,
  "%WeakMap%": typeof WeakMap === "undefined" ? n : WeakMap,
  "%WeakRef%": typeof WeakRef === "undefined" ? n : WeakRef,
  "%WeakSet%": typeof WeakSet === "undefined" ? n : WeakSet,
  "%Function.prototype.call%": M,
  "%Function.prototype.apply%": O,
  "%Object.defineProperty%": E,
  "%Object.getPrototypeOf%": A,
  "%Math.abs%": d,
  "%Math.floor%": f,
  "%Math.max%": g,
  "%Math.min%": m,
  "%Math.pow%": v,
  "%Math.round%": y,
  "%Math.sign%": h,
  "%Reflect.getPrototypeOf%": _
};
if (C) {
  try {
    null.error;
  } catch (Q) {
    var R = C(C(Q));
    N["%Error.prototype%"] = R;
  }
}
var I = function e(t) {
  var r;
  if (t === "%AsyncFunction%") {
    r = w("async function () {}");
  } else if (t === "%GeneratorFunction%") {
    r = w("function* () {}");
  } else if (t === "%AsyncGeneratorFunction%") {
    r = w("async function* () {}");
  } else if (t === "%AsyncGenerator%") {
    var n = e("%AsyncGeneratorFunction%");
    if (n) {
      r = n.prototype;
    }
  } else if (t === "%AsyncIteratorPrototype%") {
    var i = e("%AsyncGenerator%");
    if (i && C) {
      r = C(i.prototype);
    }
  }
  N[t] = r;
  return r;
};
var j = {
  __proto__: null,
  "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
  "%ArrayPrototype%": ["Array", "prototype"],
  "%ArrayProto_entries%": ["Array", "prototype", "entries"],
  "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
  "%ArrayProto_keys%": ["Array", "prototype", "keys"],
  "%ArrayProto_values%": ["Array", "prototype", "values"],
  "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
  "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
  "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
  "%BooleanPrototype%": ["Boolean", "prototype"],
  "%DataViewPrototype%": ["DataView", "prototype"],
  "%DatePrototype%": ["Date", "prototype"],
  "%ErrorPrototype%": ["Error", "prototype"],
  "%EvalErrorPrototype%": ["EvalError", "prototype"],
  "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
  "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
  "%FunctionPrototype%": ["Function", "prototype"],
  "%Generator%": ["GeneratorFunction", "prototype"],
  "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
  "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
  "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
  "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
  "%JSONParse%": ["JSON", "parse"],
  "%JSONStringify%": ["JSON", "stringify"],
  "%MapPrototype%": ["Map", "prototype"],
  "%NumberPrototype%": ["Number", "prototype"],
  "%ObjectPrototype%": ["Object", "prototype"],
  "%ObjProto_toString%": ["Object", "prototype", "toString"],
  "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
  "%PromisePrototype%": ["Promise", "prototype"],
  "%PromiseProto_then%": ["Promise", "prototype", "then"],
  "%Promise_all%": ["Promise", "all"],
  "%Promise_reject%": ["Promise", "reject"],
  "%Promise_resolve%": ["Promise", "resolve"],
  "%RangeErrorPrototype%": ["RangeError", "prototype"],
  "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
  "%RegExpPrototype%": ["RegExp", "prototype"],
  "%SetPrototype%": ["Set", "prototype"],
  "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
  "%StringPrototype%": ["String", "prototype"],
  "%SymbolPrototype%": ["Symbol", "prototype"],
  "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
  "%TypedArrayPrototype%": ["TypedArray", "prototype"],
  "%TypeErrorPrototype%": ["TypeError", "prototype"],
  "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
  "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
  "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
  "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
  "%URIErrorPrototype%": ["URIError", "prototype"],
  "%WeakMapPrototype%": ["WeakMap", "prototype"],
  "%WeakSetPrototype%": ["WeakSet", "prototype"]
};
var D = require("./48794.js");
var L = require("./5820.js");
var F = D.call(M, Array.prototype.concat);
var Z = D.call(O, Array.prototype.splice);
var z = D.call(M, String.prototype.replace);
var U = D.call(M, String.prototype.slice);
var B = D.call(M, RegExp.prototype.exec);
var V = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var H = /\\(\\)?/g;
function W(e) {
  var t = U(e, 0, 1);
  var r = U(e, -1);
  if (t === "%" && r !== "%") {
    throw new l("invalid intrinsic syntax, expected closing `%`");
  }
  if (r === "%" && t !== "%") {
    throw new l("invalid intrinsic syntax, expected opening `%`");
  }
  var n = [];
  z(e, V, function (e, t, r, i) {
    n[n.length] = r ? z(i, H, "$1") : t || e;
  });
  return n;
}
function Y(e, t) {
  var r;
  var n = e;
  if (L(j, n)) {
    r = j[n];
    n = "%" + r[0] + "%";
  }
  if (L(N, n)) {
    var i = N[n];
    if (i === P) {
      i = I(n);
    }
    if (typeof i === "undefined" && !t) {
      throw new c("intrinsic " + e + " exists, but is not available. Please file an issue!");
    }
    return {
      alias: r,
      name: n,
      value: i
    };
  }
  throw new l("intrinsic " + e + " does not exist!");
}
module.exports = function (e, t) {
  if (typeof e !== "string" || e.length === 0) {
    throw new c("intrinsic name must be a non-empty string");
  }
  if (arguments.length > 1 && typeof t !== "boolean") {
    throw new c("\"allowMissing\" argument must be a boolean");
  }
  if (B(/^%?[^%]*%?$/, e) === null) {
    throw new l("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
  }
  var r = W(e);
  var n = r.length > 0 ? r[0] : "";
  var i = Y("%" + n + "%", t);
  var o = i.name;
  var a = i.value;
  var s = false;
  var u = i.alias;
  if (u) {
    n = u[0];
    Z(r, F([0, 1], u));
  }
  for (var p = 1, d = true; p < r.length; p += 1) {
    var f = r[p];
    var g = U(f, 0, 1);
    var m = U(f, -1);
    if ((g === "\"" || g === "'" || g === "`" || m === "\"" || m === "'" || m === "`") && g !== m) {
      throw new l("property names with quotes must have matching quotes");
    }
    if (f === "constructor" || !d) {
      s = true;
    }
    n += "." + f;
    o = "%" + n + "%";
    if (L(N, o)) {
      a = N[o];
    } else if (a != null) {
      if (!(f in a)) {
        if (!t) {
          throw new c("base intrinsic for " + e + " exists, but the property is not available.");
        }
        return;
      }
      if (x && p + 1 >= r.length) {
        var v = x(a, f);
        d = !!v;
        a = d && "get" in v && !("originalValue" in v.get) ? v.get : a[f];
      } else {
        d = L(a, f);
        a = a[f];
      }
      if (d && !s) {
        N[o] = a;
      }
    }
  }
  return a;
};
};
