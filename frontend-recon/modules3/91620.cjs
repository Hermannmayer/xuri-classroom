// webpack module 91620 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./65415.js");
var i = require("./30551.js");
var o = typeof Symbol === "function" && typeof Symbol.for === "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
exports.Buffer = l;
exports.SlowBuffer = w;
exports.INSPECT_MAX_BYTES = 50;
var a = 2147483647;
function s() {
  try {
    var e = new Uint8Array(1);
    var t = {
      foo: function () {
        return 42;
      }
    };
    Object.setPrototypeOf(t, Uint8Array.prototype);
    Object.setPrototypeOf(e, t);
    return e.foo() === 42;
  } catch (r) {
    return false;
  }
}
function u(e) {
  if (e > a) {
    throw new RangeError("The value \"" + e + "\" is invalid for option \"size\"");
  }
  var t = new Uint8Array(e);
  Object.setPrototypeOf(t, l.prototype);
  return t;
}
function l(e, t, r) {
  if (typeof e === "number") {
    if (typeof t === "string") {
      throw new TypeError("The \"string\" argument must be of type string. Received type number");
    }
    return f(e);
  }
  return c(e, t, r);
}
function c(e, t, r) {
  if (typeof e === "string") {
    return g(e, t);
  }
  if (ArrayBuffer.isView(e)) {
    return v(e);
  }
  if (e == null) {
    throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof e);
  }
  if (K(e, ArrayBuffer) || e && K(e.buffer, ArrayBuffer)) {
    return y(e, t, r);
  }
  if (typeof SharedArrayBuffer !== "undefined" && (K(e, SharedArrayBuffer) || e && K(e.buffer, SharedArrayBuffer))) {
    return y(e, t, r);
  }
  if (typeof e === "number") {
    throw new TypeError("The \"value\" argument must not be of type number. Received type number");
  }
  var n = e.valueOf && e.valueOf();
  if (n != null && n !== e) {
    return l.from(n, t, r);
  }
  var i = h(e);
  if (i) {
    return i;
  }
  if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof e[Symbol.toPrimitive] === "function") {
    return l.from(e[Symbol.toPrimitive]("string"), t, r);
  }
  throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof e);
}
function p(e) {
  if (typeof e !== "number") {
    throw new TypeError("\"size\" argument must be of type number");
  }
  if (e < 0) {
    throw new RangeError("The value \"" + e + "\" is invalid for option \"size\"");
  }
}
function d(e, t, r) {
  p(e);
  if (e <= 0) {
    return u(e);
  } else if (t !== undefined) {
    if (typeof r === "string") {
      return u(e).fill(t, r);
    } else {
      return u(e).fill(t);
    }
  } else {
    return u(e);
  }
}
function f(e) {
  p(e);
  return u(e < 0 ? 0 : b(e) | 0);
}
function g(e, t) {
  if (typeof t !== "string" || t === "") {
    t = "utf8";
  }
  if (!l.isEncoding(t)) {
    throw new TypeError("Unknown encoding: " + t);
  }
  var r = x(e, t) | 0;
  var n = u(r);
  var i = n.write(e, t);
  if (i !== r) {
    n = n.slice(0, i);
  }
  return n;
}
function m(e) {
  for (var t = e.length < 0 ? 0 : b(e.length) | 0, r = u(t), n = 0; n < t; n += 1) {
    r[n] = e[n] & 255;
  }
  return r;
}
function v(e) {
  if (K(e, Uint8Array)) {
    var t = new Uint8Array(e);
    return y(t.buffer, t.byteOffset, t.byteLength);
  }
  return m(e);
}
function y(e, t, r) {
  if (t < 0 || e.byteLength < t) {
    throw new RangeError("\"offset\" is outside of buffer bounds");
  }
  if (e.byteLength < t + (r || 0)) {
    throw new RangeError("\"length\" is outside of buffer bounds");
  }
  var n;
  n = t === undefined && r === undefined ? new Uint8Array(e) : r === undefined ? new Uint8Array(e, t) : new Uint8Array(e, t, r);
  Object.setPrototypeOf(n, l.prototype);
  return n;
}
function h(e) {
  if (l.isBuffer(e)) {
    var t = b(e.length) | 0;
    var r = u(t);
    if (r.length !== 0) {
      e.copy(r, 0, 0, t);
    }
    return r;
  }
  if (e.length !== undefined) {
    if (typeof e.length !== "number" || J(e.length)) {
      return u(0);
    } else {
      return m(e);
    }
  } else if (e.type === "Buffer" && Array.isArray(e.data)) {
    return m(e.data);
  } else {
    return undefined;
  }
}
function b(e) {
  if (e >= a) {
    throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + a.toString(16) + " bytes");
  }
  return e | 0;
}
function w(e) {
  if (+e != e) {
    e = 0;
  }
  return l.alloc(+e);
}
function x(e, t) {
  if (l.isBuffer(e)) {
    return e.length;
  }
  if (ArrayBuffer.isView(e) || K(e, ArrayBuffer)) {
    return e.byteLength;
  }
  if (typeof e !== "string") {
    throw new TypeError("The \"string\" argument must be one of type string, Buffer, or ArrayBuffer. Received type " + typeof e);
  }
  var r = e.length;
  var n = arguments.length > 2 && arguments[2] === true;
  if (!n && r === 0) {
    return 0;
  }
  var i = false;
  for (;;) {
    switch (t) {
      case "ascii":
      case "latin1":
      case "binary":
        return r;
      case "utf8":
      case "utf-8":
        return W(e).length;
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return r * 2;
      case "hex":
        return r >>> 1;
      case "base64":
        return $(e).length;
      default:
        if (i) {
          if (n) {
            return -1;
          } else {
            return W(e).length;
          }
        }
        t = ("" + t).toLowerCase();
        i = true;
    }
  }
}
function E(e, t, r) {
  var n = false;
  if (t === undefined || t < 0) {
    t = 0;
  }
  if (t > this.length) {
    return "";
  }
  if (r === undefined || r > this.length) {
    r = this.length;
  }
  if (r <= 0) {
    return "";
  }
  r >>>= 0;
  t >>>= 0;
  if (r <= t) {
    return "";
  }
  e ||= "utf8";
  while (1) {
    switch (e) {
      case "hex":
        return D(this, t, r);
      case "utf8":
      case "utf-8":
        return q(this, t, r);
      case "ascii":
        return I(this, t, r);
      case "latin1":
      case "binary":
        return j(this, t, r);
      case "base64":
        return P(this, t, r);
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return L(this, t, r);
      default:
        if (n) {
          throw new TypeError("Unknown encoding: " + e);
        }
        e = (e + "").toLowerCase();
        n = true;
    }
  }
}
function k(e, t, r) {
  var n = e[t];
  e[t] = e[r];
  e[r] = n;
}
function S(e, t, r, n, i) {
  if (e.length === 0) {
    return -1;
  }
  if (typeof r === "string") {
    n = r;
    r = 0;
  } else if (r > 2147483647) {
    r = 2147483647;
  } else if (r < -2147483648) {
    r = -2147483648;
  }
  r = +r;
  if (J(r)) {
    r = i ? 0 : e.length - 1;
  }
  if (r < 0) {
    r = e.length + r;
  }
  if (r >= e.length) {
    if (i) {
      return -1;
    }
    r = e.length - 1;
  } else if (r < 0) {
    if (!i) {
      return -1;
    }
    r = 0;
  }
  if (typeof t === "string") {
    t = l.from(t, n);
  }
  if (l.isBuffer(t)) {
    if (t.length === 0) {
      return -1;
    } else {
      return T(e, t, r, n, i);
    }
  }
  if (typeof t === "number") {
    t &= 255;
    if (typeof Uint8Array.prototype.indexOf === "function") {
      if (i) {
        return Uint8Array.prototype.indexOf.call(e, t, r);
      } else {
        return Uint8Array.prototype.lastIndexOf.call(e, t, r);
      }
    } else {
      return T(e, [t], r, n, i);
    }
  }
  throw new TypeError("val must be string, number or Buffer");
}
function T(e, t, r, n, i) {
  var o;
  var a = 1;
  var s = e.length;
  var u = t.length;
  if (n !== undefined && (n = String(n).toLowerCase(), n === "ucs2" || n === "ucs-2" || n === "utf16le" || n === "utf-16le")) {
    if (e.length < 2 || t.length < 2) {
      return -1;
    }
    a = 2;
    s /= 2;
    u /= 2;
    r /= 2;
  }
  function l(e, t) {
    if (a === 1) {
      return e[t];
    } else {
      return e.readUInt16BE(t * a);
    }
  }
  if (i) {
    var c = -1;
    for (o = r; o < s; o++) {
      if (l(e, o) === l(t, c === -1 ? 0 : o - c)) {
        if (c === -1) {
          c = o;
        }
        if (o - c + 1 === u) {
          return c * a;
        }
      } else {
        if (c !== -1) {
          o -= o - c;
        }
        c = -1;
      }
    }
  } else {
    if (r + u > s) {
      r = s - u;
    }
    o = r;
    for (; o >= 0; o--) {
      var p = true;
      for (var d = 0; d < u; d++) {
        if (l(e, o + d) !== l(t, d)) {
          p = false;
          break;
        }
      }
      if (p) {
        return o;
      }
    }
  }
  return -1;
}
function C(e, t, r, n) {
  r = Number(r) || 0;
  var i = e.length - r;
  if (n) {
    n = Number(n);
    if (n > i) {
      n = i;
    }
  } else {
    n = i;
  }
  var o = t.length;
  if (n > o / 2) {
    n = o / 2;
  }
  for (var a = 0; a < n; ++a) {
    var s = parseInt(t.substr(a * 2, 2), 16);
    if (J(s)) {
      return a;
    }
    e[r + a] = s;
  }
  return a;
}
function A(e, t, r, n) {
  return G(W(t, e.length - r), e, r, n);
}
function _(e, t, r, n) {
  return G(Y(t), e, r, n);
}
function O(e, t, r, n) {
  return G($(t), e, r, n);
}
function M(e, t, r, n) {
  return G(Q(t, e.length - r), e, r, n);
}
function P(e, t, r) {
  if (t === 0 && r === e.length) {
    return n.fromByteArray(e);
  } else {
    return n.fromByteArray(e.slice(t, r));
  }
}
function q(e, t, r) {
  r = Math.min(e.length, r);
  var n = [];
  var i = t;
  while (i < r) {
    var o;
    var a;
    var s;
    var u;
    var l = e[i];
    var c = null;
    var p = l > 239 ? 4 : l > 223 ? 3 : l > 191 ? 2 : 1;
    if (i + p <= r) {
      switch (p) {
        case 1:
          if (l < 128) {
            c = l;
          }
          break;
        case 2:
          o = e[i + 1];
          if ((o & 192) === 128) {
            u = (l & 31) << 6 | o & 63;
            if (u > 127) {
              c = u;
            }
          }
          break;
        case 3:
          o = e[i + 1];
          a = e[i + 2];
          if ((o & 192) === 128 && (a & 192) === 128) {
            u = (l & 15) << 12 | (o & 63) << 6 | a & 63;
            if (u > 2047 && (u < 55296 || u > 57343)) {
              c = u;
            }
          }
          break;
        case 4:
          o = e[i + 1];
          a = e[i + 2];
          s = e[i + 3];
          if ((o & 192) === 128 && (a & 192) === 128 && (s & 192) === 128) {
            u = (l & 15) << 18 | (o & 63) << 12 | (a & 63) << 6 | s & 63;
            if (u > 65535 && u < 1114112) {
              c = u;
            }
          }
      }
    }
    if (c === null) {
      c = 65533;
      p = 1;
    } else if (c > 65535) {
      c -= 65536;
      n.push(c >>> 10 & 1023 | 55296);
      c = c & 1023 | 56320;
    }
    n.push(c);
    i += p;
  }
  return R(n);
}
exports.kMaxLength = a;
l.TYPED_ARRAY_SUPPORT = s();
if (!l.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
  console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
}
Object.defineProperty(l.prototype, "parent", {
  enumerable: true,
  get: function () {
    if (l.isBuffer(this)) {
      return this.buffer;
    }
  }
});
Object.defineProperty(l.prototype, "offset", {
  enumerable: true,
  get: function () {
    if (l.isBuffer(this)) {
      return this.byteOffset;
    }
  }
});
l.poolSize = 8192;
l.from = function (e, t, r) {
  return c(e, t, r);
};
Object.setPrototypeOf(l.prototype, Uint8Array.prototype);
Object.setPrototypeOf(l, Uint8Array);
l.alloc = function (e, t, r) {
  return d(e, t, r);
};
l.allocUnsafe = function (e) {
  return f(e);
};
l.allocUnsafeSlow = function (e) {
  return f(e);
};
l.isBuffer = function (e) {
  return e != null && e._isBuffer === true && e !== l.prototype;
};
l.compare = function (e, t) {
  if (K(e, Uint8Array)) {
    e = l.from(e, e.offset, e.byteLength);
  }
  if (K(t, Uint8Array)) {
    t = l.from(t, t.offset, t.byteLength);
  }
  if (!l.isBuffer(e) || !l.isBuffer(t)) {
    throw new TypeError("The \"buf1\", \"buf2\" arguments must be one of type Buffer or Uint8Array");
  }
  if (e === t) {
    return 0;
  }
  var r = e.length;
  var n = t.length;
  for (var i = 0, o = Math.min(r, n); i < o; ++i) {
    if (e[i] !== t[i]) {
      r = e[i];
      n = t[i];
      break;
    }
  }
  if (r < n) {
    return -1;
  } else if (n < r) {
    return 1;
  } else {
    return 0;
  }
};
l.isEncoding = function (e) {
  switch (String(e).toLowerCase()) {
    case "hex":
    case "utf8":
    case "utf-8":
    case "ascii":
    case "latin1":
    case "binary":
    case "base64":
    case "ucs2":
    case "ucs-2":
    case "utf16le":
    case "utf-16le":
      return true;
    default:
      return false;
  }
};
l.concat = function (e, t) {
  if (!Array.isArray(e)) {
    throw new TypeError("\"list\" argument must be an Array of Buffers");
  }
  if (e.length === 0) {
    return l.alloc(0);
  }
  var r;
  if (t === undefined) {
    t = 0;
    r = 0;
    for (; r < e.length; ++r) {
      t += e[r].length;
    }
  }
  var n = l.allocUnsafe(t);
  var i = 0;
  for (r = 0; r < e.length; ++r) {
    var o = e[r];
    if (K(o, Uint8Array)) {
      if (i + o.length > n.length) {
        l.from(o).copy(n, i);
      } else {
        Uint8Array.prototype.set.call(n, o, i);
      }
    } else {
      if (!l.isBuffer(o)) {
        throw new TypeError("\"list\" argument must be an Array of Buffers");
      }
      o.copy(n, i);
    }
    i += o.length;
  }
  return n;
};
l.byteLength = x;
l.prototype._isBuffer = true;
l.prototype.swap16 = function () {
  var e = this.length;
  if (e % 2 !== 0) {
    throw new RangeError("Buffer size must be a multiple of 16-bits");
  }
  for (var t = 0; t < e; t += 2) {
    k(this, t, t + 1);
  }
  return this;
};
l.prototype.swap32 = function () {
  var e = this.length;
  if (e % 4 !== 0) {
    throw new RangeError("Buffer size must be a multiple of 32-bits");
  }
  for (var t = 0; t < e; t += 4) {
    k(this, t, t + 3);
    k(this, t + 1, t + 2);
  }
  return this;
};
l.prototype.swap64 = function () {
  var e = this.length;
  if (e % 8 !== 0) {
    throw new RangeError("Buffer size must be a multiple of 64-bits");
  }
  for (var t = 0; t < e; t += 8) {
    k(this, t, t + 7);
    k(this, t + 1, t + 6);
    k(this, t + 2, t + 5);
    k(this, t + 3, t + 4);
  }
  return this;
};
l.prototype.toString = function () {
  var e = this.length;
  if (e === 0) {
    return "";
  } else if (arguments.length === 0) {
    return q(this, 0, e);
  } else {
    return E.apply(this, arguments);
  }
};
l.prototype.toLocaleString = l.prototype.toString;
l.prototype.equals = function (e) {
  if (!l.isBuffer(e)) {
    throw new TypeError("Argument must be a Buffer");
  }
  return this === e || l.compare(this, e) === 0;
};
l.prototype.inspect = function () {
  var e = "";
  var r = exports.INSPECT_MAX_BYTES;
  e = this.toString("hex", 0, r).replace(/(.{2})/g, "$1 ").trim();
  if (this.length > r) {
    e += " ... ";
  }
  return "<Buffer " + e + ">";
};
if (o) {
  l.prototype[o] = l.prototype.inspect;
}
l.prototype.compare = function (e, t, r, n, i) {
  if (K(e, Uint8Array)) {
    e = l.from(e, e.offset, e.byteLength);
  }
  if (!l.isBuffer(e)) {
    throw new TypeError("The \"target\" argument must be one of type Buffer or Uint8Array. Received type " + typeof e);
  }
  if (t === undefined) {
    t = 0;
  }
  if (r === undefined) {
    r = e ? e.length : 0;
  }
  if (n === undefined) {
    n = 0;
  }
  if (i === undefined) {
    i = this.length;
  }
  if (t < 0 || r > e.length || n < 0 || i > this.length) {
    throw new RangeError("out of range index");
  }
  if (n >= i && t >= r) {
    return 0;
  }
  if (n >= i) {
    return -1;
  }
  if (t >= r) {
    return 1;
  }
  t >>>= 0;
  r >>>= 0;
  n >>>= 0;
  i >>>= 0;
  if (this === e) {
    return 0;
  }
  var o = i - n;
  var a = r - t;
  for (var s = Math.min(o, a), u = this.slice(n, i), c = e.slice(t, r), p = 0; p < s; ++p) {
    if (u[p] !== c[p]) {
      o = u[p];
      a = c[p];
      break;
    }
  }
  if (o < a) {
    return -1;
  } else if (a < o) {
    return 1;
  } else {
    return 0;
  }
};
l.prototype.includes = function (e, t, r) {
  return this.indexOf(e, t, r) !== -1;
};
l.prototype.indexOf = function (e, t, r) {
  return S(this, e, t, r, true);
};
l.prototype.lastIndexOf = function (e, t, r) {
  return S(this, e, t, r, false);
};
l.prototype.write = function (e, t, r, n) {
  if (t === undefined) {
    n = "utf8";
    r = this.length;
    t = 0;
  } else if (r === undefined && typeof t === "string") {
    n = t;
    r = this.length;
    t = 0;
  } else {
    if (!isFinite(t)) {
      throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
    }
    t >>>= 0;
    if (isFinite(r)) {
      r >>>= 0;
      if (n === undefined) {
        n = "utf8";
      }
    } else {
      n = r;
      r = undefined;
    }
  }
  var i = this.length - t;
  if (r === undefined || r > i) {
    r = i;
  }
  if (e.length > 0 && (r < 0 || t < 0) || t > this.length) {
    throw new RangeError("Attempt to write outside buffer bounds");
  }
  n ||= "utf8";
  var o = false;
  for (;;) {
    switch (n) {
      case "hex":
        return C(this, e, t, r);
      case "utf8":
      case "utf-8":
        return A(this, e, t, r);
      case "ascii":
      case "latin1":
      case "binary":
        return _(this, e, t, r);
      case "base64":
        return O(this, e, t, r);
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return M(this, e, t, r);
      default:
        if (o) {
          throw new TypeError("Unknown encoding: " + n);
        }
        n = ("" + n).toLowerCase();
        o = true;
    }
  }
};
l.prototype.toJSON = function () {
  return {
    type: "Buffer",
    data: Array.prototype.slice.call(this._arr || this, 0)
  };
};
var N = 4096;
function R(e) {
  var t = e.length;
  if (t <= N) {
    return String.fromCharCode.apply(String, e);
  }
  var r = "";
  var n = 0;
  while (n < t) {
    r += String.fromCharCode.apply(String, e.slice(n, n += N));
  }
  return r;
}
function I(e, t, r) {
  var n = "";
  r = Math.min(e.length, r);
  for (var i = t; i < r; ++i) {
    n += String.fromCharCode(e[i] & 127);
  }
  return n;
}
function j(e, t, r) {
  var n = "";
  r = Math.min(e.length, r);
  for (var i = t; i < r; ++i) {
    n += String.fromCharCode(e[i]);
  }
  return n;
}
function D(e, t, r) {
  var n = e.length;
  if (!t || t < 0) {
    t = 0;
  }
  if (!r || r < 0 || r > n) {
    r = n;
  }
  var i = "";
  for (var o = t; o < r; ++o) {
    i += X[e[o]];
  }
  return i;
}
function L(e, t, r) {
  for (var n = e.slice(t, r), i = "", o = 0; o < n.length - 1; o += 2) {
    i += String.fromCharCode(n[o] + n[o + 1] * 256);
  }
  return i;
}
function F(e, t, r) {
  if (e % 1 !== 0 || e < 0) {
    throw new RangeError("offset is not uint");
  }
  if (e + t > r) {
    throw new RangeError("Trying to access beyond buffer length");
  }
}
function Z(e, t, r, n, i, o) {
  if (!l.isBuffer(e)) {
    throw new TypeError("\"buffer\" argument must be a Buffer instance");
  }
  if (t > i || t < o) {
    throw new RangeError("\"value\" argument is out of bounds");
  }
  if (r + n > e.length) {
    throw new RangeError("Index out of range");
  }
}
function z(e, t, r, n, i, o) {
  if (r + n > e.length) {
    throw new RangeError("Index out of range");
  }
  if (r < 0) {
    throw new RangeError("Index out of range");
  }
}
function U(e, t, r, n, o) {
  t = +t;
  r >>>= 0;
  if (!o) {
    z(e, t, r, 4, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }
  i.write(e, t, r, n, 23, 4);
  return r + 4;
}
function B(e, t, r, n, o) {
  t = +t;
  r >>>= 0;
  if (!o) {
    z(e, t, r, 8, 1.7976931348623157e+308, -1.7976931348623157e+308);
  }
  i.write(e, t, r, n, 52, 8);
  return r + 8;
}
l.prototype.slice = function (e, t) {
  var r = this.length;
  e = ~~e;
  t = t === undefined ? r : ~~t;
  if (e < 0) {
    e += r;
    if (e < 0) {
      e = 0;
    }
  } else if (e > r) {
    e = r;
  }
  if (t < 0) {
    t += r;
    if (t < 0) {
      t = 0;
    }
  } else if (t > r) {
    t = r;
  }
  if (t < e) {
    t = e;
  }
  var n = this.subarray(e, t);
  Object.setPrototypeOf(n, l.prototype);
  return n;
};
l.prototype.readUintLE = l.prototype.readUIntLE = function (e, t, r) {
  e >>>= 0;
  t >>>= 0;
  if (!r) {
    F(e, t, this.length);
  }
  var n = this[e];
  var i = 1;
  var o = 0;
  while (++o < t && (i *= 256)) {
    n += this[e + o] * i;
  }
  return n;
};
l.prototype.readUintBE = l.prototype.readUIntBE = function (e, t, r) {
  e >>>= 0;
  t >>>= 0;
  if (!r) {
    F(e, t, this.length);
  }
  var n = this[e + --t];
  var i = 1;
  while (t > 0 && (i *= 256)) {
    n += this[e + --t] * i;
  }
  return n;
};
l.prototype.readUint8 = l.prototype.readUInt8 = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 1, this.length);
  }
  return this[e];
};
l.prototype.readUint16LE = l.prototype.readUInt16LE = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 2, this.length);
  }
  return this[e] | this[e + 1] << 8;
};
l.prototype.readUint16BE = l.prototype.readUInt16BE = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 2, this.length);
  }
  return this[e] << 8 | this[e + 1];
};
l.prototype.readUint32LE = l.prototype.readUInt32LE = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 4, this.length);
  }
  return (this[e] | this[e + 1] << 8 | this[e + 2] << 16) + this[e + 3] * 16777216;
};
l.prototype.readUint32BE = l.prototype.readUInt32BE = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 4, this.length);
  }
  return this[e] * 16777216 + (this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3]);
};
l.prototype.readIntLE = function (e, t, r) {
  e >>>= 0;
  t >>>= 0;
  if (!r) {
    F(e, t, this.length);
  }
  var n = this[e];
  var i = 1;
  var o = 0;
  while (++o < t && (i *= 256)) {
    n += this[e + o] * i;
  }
  i *= 128;
  if (n >= i) {
    n -= Math.pow(2, t * 8);
  }
  return n;
};
l.prototype.readIntBE = function (e, t, r) {
  e >>>= 0;
  t >>>= 0;
  if (!r) {
    F(e, t, this.length);
  }
  var n = t;
  var i = 1;
  var o = this[e + --n];
  while (n > 0 && (i *= 256)) {
    o += this[e + --n] * i;
  }
  i *= 128;
  if (o >= i) {
    o -= Math.pow(2, t * 8);
  }
  return o;
};
l.prototype.readInt8 = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 1, this.length);
  }
  if (this[e] & 128) {
    return (255 - this[e] + 1) * -1;
  } else {
    return this[e];
  }
};
l.prototype.readInt16LE = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 2, this.length);
  }
  var r = this[e] | this[e + 1] << 8;
  if (r & 32768) {
    return r | -65536;
  } else {
    return r;
  }
};
l.prototype.readInt16BE = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 2, this.length);
  }
  var r = this[e + 1] | this[e] << 8;
  if (r & 32768) {
    return r | -65536;
  } else {
    return r;
  }
};
l.prototype.readInt32LE = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 4, this.length);
  }
  return this[e] | this[e + 1] << 8 | this[e + 2] << 16 | this[e + 3] << 24;
};
l.prototype.readInt32BE = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 4, this.length);
  }
  return this[e] << 24 | this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3];
};
l.prototype.readFloatLE = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 4, this.length);
  }
  return i.read(this, e, true, 23, 4);
};
l.prototype.readFloatBE = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 4, this.length);
  }
  return i.read(this, e, false, 23, 4);
};
l.prototype.readDoubleLE = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 8, this.length);
  }
  return i.read(this, e, true, 52, 8);
};
l.prototype.readDoubleBE = function (e, t) {
  e >>>= 0;
  if (!t) {
    F(e, 8, this.length);
  }
  return i.read(this, e, false, 52, 8);
};
l.prototype.writeUintLE = l.prototype.writeUIntLE = function (e, t, r, n) {
  e = +e;
  t >>>= 0;
  r >>>= 0;
  if (!n) {
    var i = Math.pow(2, r * 8) - 1;
    Z(this, e, t, r, i, 0);
  }
  var o = 1;
  var a = 0;
  this[t] = e & 255;
  while (++a < r && (o *= 256)) {
    this[t + a] = e / o & 255;
  }
  return t + r;
};
l.prototype.writeUintBE = l.prototype.writeUIntBE = function (e, t, r, n) {
  e = +e;
  t >>>= 0;
  r >>>= 0;
  if (!n) {
    var i = Math.pow(2, r * 8) - 1;
    Z(this, e, t, r, i, 0);
  }
  var o = r - 1;
  var a = 1;
  this[t + o] = e & 255;
  while (--o >= 0 && (a *= 256)) {
    this[t + o] = e / a & 255;
  }
  return t + r;
};
l.prototype.writeUint8 = l.prototype.writeUInt8 = function (e, t, r) {
  e = +e;
  t >>>= 0;
  if (!r) {
    Z(this, e, t, 1, 255, 0);
  }
  this[t] = e & 255;
  return t + 1;
};
l.prototype.writeUint16LE = l.prototype.writeUInt16LE = function (e, t, r) {
  e = +e;
  t >>>= 0;
  if (!r) {
    Z(this, e, t, 2, 65535, 0);
  }
  this[t] = e & 255;
  this[t + 1] = e >>> 8;
  return t + 2;
};
l.prototype.writeUint16BE = l.prototype.writeUInt16BE = function (e, t, r) {
  e = +e;
  t >>>= 0;
  if (!r) {
    Z(this, e, t, 2, 65535, 0);
  }
  this[t] = e >>> 8;
  this[t + 1] = e & 255;
  return t + 2;
};
l.prototype.writeUint32LE = l.prototype.writeUInt32LE = function (e, t, r) {
  e = +e;
  t >>>= 0;
  if (!r) {
    Z(this, e, t, 4, 4294967295, 0);
  }
  this[t + 3] = e >>> 24;
  this[t + 2] = e >>> 16;
  this[t + 1] = e >>> 8;
  this[t] = e & 255;
  return t + 4;
};
l.prototype.writeUint32BE = l.prototype.writeUInt32BE = function (e, t, r) {
  e = +e;
  t >>>= 0;
  if (!r) {
    Z(this, e, t, 4, 4294967295, 0);
  }
  this[t] = e >>> 24;
  this[t + 1] = e >>> 16;
  this[t + 2] = e >>> 8;
  this[t + 3] = e & 255;
  return t + 4;
};
l.prototype.writeIntLE = function (e, t, r, n) {
  e = +e;
  t >>>= 0;
  if (!n) {
    var i = Math.pow(2, r * 8 - 1);
    Z(this, e, t, r, i - 1, -i);
  }
  var o = 0;
  var a = 1;
  var s = 0;
  this[t] = e & 255;
  while (++o < r && (a *= 256)) {
    if (e < 0 && s === 0 && this[t + o - 1] !== 0) {
      s = 1;
    }
    this[t + o] = (e / a >> 0) - s & 255;
  }
  return t + r;
};
l.prototype.writeIntBE = function (e, t, r, n) {
  e = +e;
  t >>>= 0;
  if (!n) {
    var i = Math.pow(2, r * 8 - 1);
    Z(this, e, t, r, i - 1, -i);
  }
  var o = r - 1;
  var a = 1;
  var s = 0;
  this[t + o] = e & 255;
  while (--o >= 0 && (a *= 256)) {
    if (e < 0 && s === 0 && this[t + o + 1] !== 0) {
      s = 1;
    }
    this[t + o] = (e / a >> 0) - s & 255;
  }
  return t + r;
};
l.prototype.writeInt8 = function (e, t, r) {
  e = +e;
  t >>>= 0;
  if (!r) {
    Z(this, e, t, 1, 127, -128);
  }
  if (e < 0) {
    e = 255 + e + 1;
  }
  this[t] = e & 255;
  return t + 1;
};
l.prototype.writeInt16LE = function (e, t, r) {
  e = +e;
  t >>>= 0;
  if (!r) {
    Z(this, e, t, 2, 32767, -32768);
  }
  this[t] = e & 255;
  this[t + 1] = e >>> 8;
  return t + 2;
};
l.prototype.writeInt16BE = function (e, t, r) {
  e = +e;
  t >>>= 0;
  if (!r) {
    Z(this, e, t, 2, 32767, -32768);
  }
  this[t] = e >>> 8;
  this[t + 1] = e & 255;
  return t + 2;
};
l.prototype.writeInt32LE = function (e, t, r) {
  e = +e;
  t >>>= 0;
  if (!r) {
    Z(this, e, t, 4, 2147483647, -2147483648);
  }
  this[t] = e & 255;
  this[t + 1] = e >>> 8;
  this[t + 2] = e >>> 16;
  this[t + 3] = e >>> 24;
  return t + 4;
};
l.prototype.writeInt32BE = function (e, t, r) {
  e = +e;
  t >>>= 0;
  if (!r) {
    Z(this, e, t, 4, 2147483647, -2147483648);
  }
  if (e < 0) {
    e = 4294967295 + e + 1;
  }
  this[t] = e >>> 24;
  this[t + 1] = e >>> 16;
  this[t + 2] = e >>> 8;
  this[t + 3] = e & 255;
  return t + 4;
};
l.prototype.writeFloatLE = function (e, t, r) {
  return U(this, e, t, true, r);
};
l.prototype.writeFloatBE = function (e, t, r) {
  return U(this, e, t, false, r);
};
l.prototype.writeDoubleLE = function (e, t, r) {
  return B(this, e, t, true, r);
};
l.prototype.writeDoubleBE = function (e, t, r) {
  return B(this, e, t, false, r);
};
l.prototype.copy = function (e, t, r, n) {
  if (!l.isBuffer(e)) {
    throw new TypeError("argument should be a Buffer");
  }
  r ||= 0;
  if (!n && n !== 0) {
    n = this.length;
  }
  if (t >= e.length) {
    t = e.length;
  }
  t ||= 0;
  if (n > 0 && n < r) {
    n = r;
  }
  if (n === r) {
    return 0;
  }
  if (e.length === 0 || this.length === 0) {
    return 0;
  }
  if (t < 0) {
    throw new RangeError("targetStart out of bounds");
  }
  if (r < 0 || r >= this.length) {
    throw new RangeError("Index out of range");
  }
  if (n < 0) {
    throw new RangeError("sourceEnd out of bounds");
  }
  if (n > this.length) {
    n = this.length;
  }
  if (e.length - t < n - r) {
    n = e.length - t + r;
  }
  var i = n - r;
  if (this === e && typeof Uint8Array.prototype.copyWithin === "function") {
    this.copyWithin(t, r, n);
  } else {
    Uint8Array.prototype.set.call(e, this.subarray(r, n), t);
  }
  return i;
};
l.prototype.fill = function (e, t, r, n) {
  if (typeof e === "string") {
    if (typeof t === "string") {
      n = t;
      t = 0;
      r = this.length;
    } else if (typeof r === "string") {
      n = r;
      r = this.length;
    }
    if (n !== undefined && typeof n !== "string") {
      throw new TypeError("encoding must be a string");
    }
    if (typeof n === "string" && !l.isEncoding(n)) {
      throw new TypeError("Unknown encoding: " + n);
    }
    if (e.length === 1) {
      var i = e.charCodeAt(0);
      if (n === "utf8" && i < 128 || n === "latin1") {
        e = i;
      }
    }
  } else if (typeof e === "number") {
    e &= 255;
  } else if (typeof e === "boolean") {
    e = Number(e);
  }
  if (t < 0 || this.length < t || this.length < r) {
    throw new RangeError("Out of range index");
  }
  if (r <= t) {
    return this;
  }
  var o;
  t >>>= 0;
  r = r === undefined ? this.length : r >>> 0;
  e ||= 0;
  if (typeof e === "number") {
    for (o = t; o < r; ++o) {
      this[o] = e;
    }
  } else {
    var a = l.isBuffer(e) ? e : l.from(e, n);
    var s = a.length;
    if (s === 0) {
      throw new TypeError("The value \"" + e + "\" is invalid for argument \"value\"");
    }
    for (o = 0; o < r - t; ++o) {
      this[o + t] = a[o % s];
    }
  }
  return this;
};
var V = /[^+/0-9A-Za-z-_]/g;
function H(e) {
  e = e.split("=")[0];
  e = e.trim().replace(V, "");
  if (e.length < 2) {
    return "";
  }
  while (e.length % 4 !== 0) {
    e += "=";
  }
  return e;
}
function W(e, t) {
  var r;
  t = t || Infinity;
  for (var n = e.length, i = null, o = [], a = 0; a < n; ++a) {
    r = e.charCodeAt(a);
    if (r > 55295 && r < 57344) {
      if (!i) {
        if (r > 56319) {
          if ((t -= 3) > -1) {
            o.push(239, 191, 189);
          }
          continue;
        }
        if (a + 1 === n) {
          if ((t -= 3) > -1) {
            o.push(239, 191, 189);
          }
          continue;
        }
        i = r;
        continue;
      }
      if (r < 56320) {
        if ((t -= 3) > -1) {
          o.push(239, 191, 189);
        }
        i = r;
        continue;
      }
      r = 65536 + (i - 55296 << 10 | r - 56320);
    } else if (i && (t -= 3) > -1) {
      o.push(239, 191, 189);
    }
    i = null;
    if (r < 128) {
      if ((t -= 1) < 0) {
        break;
      }
      o.push(r);
    } else if (r < 2048) {
      if ((t -= 2) < 0) {
        break;
      }
      o.push(r >> 6 | 192, r & 63 | 128);
    } else if (r < 65536) {
      if ((t -= 3) < 0) {
        break;
      }
      o.push(r >> 12 | 224, r >> 6 & 63 | 128, r & 63 | 128);
    } else {
      if (!(r < 1114112)) {
        throw new Error("Invalid code point");
      }
      if ((t -= 4) < 0) {
        break;
      }
      o.push(r >> 18 | 240, r >> 12 & 63 | 128, r >> 6 & 63 | 128, r & 63 | 128);
    }
  }
  return o;
}
function Y(e) {
  var t = [];
  for (var r = 0; r < e.length; ++r) {
    t.push(e.charCodeAt(r) & 255);
  }
  return t;
}
function Q(e, t) {
  var r;
  var n;
  var i;
  var o = [];
  for (var a = 0; a < e.length; ++a) {
    if ((t -= 2) < 0) {
      break;
    }
    r = e.charCodeAt(a);
    n = r >> 8;
    i = r % 256;
    o.push(i);
    o.push(n);
  }
  return o;
}
function $(e) {
  return n.toByteArray(H(e));
}
function G(e, t, r, n) {
  for (var i = 0; i < n; ++i) {
    if (i + r >= t.length || i >= e.length) {
      break;
    }
    t[i + r] = e[i];
  }
  return i;
}
function K(e, t) {
  return e instanceof t || e != null && e.constructor != null && e.constructor.name != null && e.constructor.name === t.name;
}
function J(e) {
  return e !== e;
}
var X = function () {
  var e = "0123456789abcdef";
  var t = new Array(256);
  for (var r = 0; r < 16; ++r) {
    var n = r * 16;
    for (var i = 0; i < 16; ++i) {
      t[n + i] = e[r] + e[i];
    }
  }
  return t;
}();
};
