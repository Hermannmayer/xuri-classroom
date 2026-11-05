// webpack module 67012 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return Ir;
  }
});
var n = {};
function i(e, t) {
  return function () {
    return e.apply(t, arguments);
  };
}
require.d(n, {
  hasBrowserEnv: function () {
    return pt;
  },
  hasStandardBrowserEnv: function () {
    return ft;
  },
  hasStandardBrowserWebWorkerEnv: function () {
    return gt;
  },
  navigator: function () {
    return dt;
  },
  origin: function () {
    return mt;
  }
});
var o = require("14224");
const {
  toString: a
} = Object.prototype;
const {
  getPrototypeOf: s
} = Object;
const {
  iterator: u,
  toStringTag: l
} = Symbol;
const c = (e => t => {
  const r = a.call(t);
  return e[r] ||= r.slice(8, -1).toLowerCase();
})(Object.create(null));
const p = e => {
  e = e.toLowerCase();
  return t => c(t) === e;
};
const d = e => t => typeof t === e;
const {
  isArray: f
} = Array;
const g = d("undefined");
function m(e) {
  return e !== null && !g(e) && e.constructor !== null && !g(e.constructor) && b(e.constructor.isBuffer) && e.constructor.isBuffer(e);
}
const v = p("ArrayBuffer");
function y(e) {
  let t;
  t = typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView ? ArrayBuffer.isView(e) : e && e.buffer && v(e.buffer);
  return t;
}
const h = d("string");
const b = d("function");
const w = d("number");
const x = e => e !== null && typeof e === "object";
const E = e => e === true || e === false;
const k = e => {
  if (c(e) !== "object") {
    return false;
  }
  const t = s(e);
  return (t === null || t === Object.prototype || Object.getPrototypeOf(t) === null) && !(l in e) && !(u in e);
};
const S = e => {
  if (!x(e) || m(e)) {
    return false;
  }
  try {
    return Object.keys(e).length === 0 && Object.getPrototypeOf(e) === Object.prototype;
  } catch (t) {
    return false;
  }
};
const T = p("Date");
const C = p("File");
const A = e => !!e && typeof e.uri !== "undefined";
const _ = e => e && typeof e.getParts !== "undefined";
const O = p("Blob");
const M = p("FileList");
const P = e => x(e) && b(e.pipe);
function q() {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  } else if (typeof self !== "undefined") {
    return self;
  } else if (typeof window !== "undefined") {
    return window;
  } else if (typeof global !== "undefined") {
    return global;
  } else {
    return {};
  }
}
const N = q();
const R = typeof N.FormData !== "undefined" ? N.FormData : undefined;
const I = e => {
  if (!e) {
    return false;
  }
  if (R && e instanceof R) {
    return true;
  }
  const t = s(e);
  if (!t || t === Object.prototype) {
    return false;
  }
  if (!b(e.append)) {
    return false;
  }
  const r = c(e);
  return r === "formdata" || r === "object" && b(e.toString) && e.toString() === "[object FormData]";
};
const j = p("URLSearchParams");
const [D, L, F, Z] = ["ReadableStream", "Request", "Response", "Headers"].map(p);
const z = e => e.trim ? e.trim() : e.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function U(e, t, {
  allOwnKeys: r = false
} = {}) {
  if (e === null || typeof e === "undefined") {
    return;
  }
  let n;
  let i;
  if (typeof e !== "object") {
    e = [e];
  }
  if (f(e)) {
    n = 0;
    i = e.length;
    for (; n < i; n++) {
      t.call(null, e[n], n, e);
    }
  } else {
    if (m(e)) {
      return;
    }
    const i = r ? Object.getOwnPropertyNames(e) : Object.keys(e);
    const o = i.length;
    let a;
    for (n = 0; n < o; n++) {
      a = i[n];
      t.call(null, e[a], a, e);
    }
  }
}
function B(e, t) {
  if (m(e)) {
    return null;
  }
  t = t.toLowerCase();
  const r = Object.keys(e);
  let n;
  let i = r.length;
  while (i-- > 0) {
    n = r[i];
    if (t === n.toLowerCase()) {
      return n;
    }
  }
  return null;
}
const V = (() => typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global)();
const H = e => !g(e) && e !== V;
function W(...e) {
  const {
    caseless: t,
    skipUndefined: r
  } = H(this) && this || {};
  const n = {};
  const i = (e, i) => {
    if (i === "__proto__" || i === "constructor" || i === "prototype") {
      return;
    }
    const o = t && B(n, i) || i;
    const a = ie(n, o) ? n[o] : undefined;
    if (k(a) && k(e)) {
      n[o] = W(a, e);
    } else if (k(e)) {
      n[o] = W({}, e);
    } else if (f(e)) {
      n[o] = e.slice();
    } else if (!r || !g(e)) {
      n[o] = e;
    }
  };
  for (let o = 0, a = e.length; o < a; o++) {
    if (e[o]) {
      U(e[o], i);
    }
  }
  return n;
}
const Y = (e, t, r, {
  allOwnKeys: n
} = {}) => {
  U(t, (t, n) => {
    if (r && b(t)) {
      Object.defineProperty(e, n, {
        __proto__: null,
        value: i(t, r),
        writable: true,
        enumerable: true,
        configurable: true
      });
    } else {
      Object.defineProperty(e, n, {
        __proto__: null,
        value: t,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  }, {
    allOwnKeys: n
  });
  return e;
};
const Q = e => {
  if (e.charCodeAt(0) === 65279) {
    e = e.slice(1);
  }
  return e;
};
const $ = (e, t, r, n) => {
  e.prototype = Object.create(t.prototype, n);
  Object.defineProperty(e.prototype, "constructor", {
    __proto__: null,
    value: e,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e, "super", {
    __proto__: null,
    value: t.prototype
  });
  if (r) {
    Object.assign(e.prototype, r);
  }
};
const G = (e, t, r, n) => {
  let i;
  let o;
  let a;
  const u = {};
  t = t || {};
  if (e == null) {
    return t;
  }
  do {
    i = Object.getOwnPropertyNames(e);
    o = i.length;
    while (o-- > 0) {
      a = i[o];
      if ((!n || !!n(a, e, t)) && !u[a]) {
        t[a] = e[a];
        u[a] = true;
      }
    }
    e = r !== false && s(e);
  } while (e && (!r || r(e, t)) && e !== Object.prototype);
  return t;
};
const K = (e, t, r) => {
  e = String(e);
  if (r === undefined || r > e.length) {
    r = e.length;
  }
  r -= t.length;
  const n = e.indexOf(t, r);
  return n !== -1 && n === r;
};
const J = e => {
  if (!e) {
    return null;
  }
  if (f(e)) {
    return e;
  }
  let t = e.length;
  if (!w(t)) {
    return null;
  }
  const r = new Array(t);
  while (t-- > 0) {
    r[t] = e[t];
  }
  return r;
};
const X = (e => t => e && t instanceof e)(typeof Uint8Array !== "undefined" && s(Uint8Array));
const ee = (e, t) => {
  const r = e && e[u];
  const n = r.call(e);
  let i;
  while ((i = n.next()) && !i.done) {
    const r = i.value;
    t.call(e, r[0], r[1]);
  }
};
const te = (e, t) => {
  let r;
  const n = [];
  while ((r = e.exec(t)) !== null) {
    n.push(r);
  }
  return n;
};
const re = p("HTMLFormElement");
const ne = e => e.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function (e, t, r) {
  return t.toUpperCase() + r;
});
const ie = (({
  hasOwnProperty: e
}) => (t, r) => e.call(t, r))(Object.prototype);
const oe = p("RegExp");
const ae = (e, t) => {
  const r = Object.getOwnPropertyDescriptors(e);
  const n = {};
  U(r, (r, i) => {
    let o;
    if ((o = t(r, i, e)) !== false) {
      n[i] = o || r;
    }
  });
  Object.defineProperties(e, n);
};
const se = e => {
  ae(e, (t, r) => {
    if (b(e) && ["arguments", "caller", "callee"].includes(r)) {
      return false;
    }
    const n = e[r];
    if (b(n)) {
      t.enumerable = false;
      if ("writable" in t) {
        t.writable = false;
      } else {
        t.set ||= () => {
          throw Error("Can not rewrite read-only method '" + r + "'");
        };
      }
    }
  });
};
const ue = (e, t) => {
  const r = {};
  const n = e => {
    e.forEach(e => {
      r[e] = true;
    });
  };
  if (f(e)) {
    n(e);
  } else {
    n(String(e).split(t));
  }
  return r;
};
const le = () => {};
const ce = (e, t) => e != null && Number.isFinite(e = +e) ? e : t;
function pe(e) {
  return !!e && !!b(e.append) && e[l] === "FormData" && !!e[u];
}
const de = e => {
  const t = new WeakSet();
  const r = e => {
    if (x(e)) {
      if (t.has(e)) {
        return;
      }
      if (m(e)) {
        return e;
      }
      if (!("toJSON" in e)) {
        t.add(e);
        const n = f(e) ? [] : {};
        U(e, (e, t) => {
          const i = r(e);
          if (!g(i)) {
            n[t] = i;
          }
        });
        t.delete(e);
        return n;
      }
    }
    return e;
  };
  return r(e);
};
const fe = p("AsyncFunction");
const ge = e => e && (x(e) || b(e)) && b(e.then) && b(e.catch);
const me = ((e, t) => e ? setImmediate : t ? ((e, t) => {
  V.addEventListener("message", ({
    source: r,
    data: n
  }) => {
    if (r === V && n === e && t.length) {
      t.shift()();
    }
  }, false);
  return r => {
    t.push(r);
    V.postMessage(e, "*");
  };
})(`axios@${Math.random()}`, []) : e => setTimeout(e))(typeof setImmediate === "function", b(V.postMessage));
const ve = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(V) : typeof o !== "undefined" && o.nextTick || me;
const ye = e => e != null && b(e[u]);
var he = {
  isArray: f,
  isArrayBuffer: v,
  isBuffer: m,
  isFormData: I,
  isArrayBufferView: y,
  isString: h,
  isNumber: w,
  isBoolean: E,
  isObject: x,
  isPlainObject: k,
  isEmptyObject: S,
  isReadableStream: D,
  isRequest: L,
  isResponse: F,
  isHeaders: Z,
  isUndefined: g,
  isDate: T,
  isFile: C,
  isReactNativeBlob: A,
  isReactNative: _,
  isBlob: O,
  isRegExp: oe,
  isFunction: b,
  isStream: P,
  isURLSearchParams: j,
  isTypedArray: X,
  isFileList: M,
  forEach: U,
  merge: W,
  extend: Y,
  trim: z,
  stripBOM: Q,
  inherits: $,
  toFlatObject: G,
  kindOf: c,
  kindOfTest: p,
  endsWith: K,
  toArray: J,
  forEachEntry: ee,
  matchAll: te,
  isHTMLForm: re,
  hasOwnProperty: ie,
  hasOwnProp: ie,
  reduceDescriptors: ae,
  freezeMethods: se,
  toObjectSet: ue,
  toCamelCase: ne,
  noop: le,
  toFiniteNumber: ce,
  findKey: B,
  global: V,
  isContextDefined: H,
  isSpecCompliantForm: pe,
  toJSONObject: de,
  isAsyncFn: fe,
  isThenable: ge,
  setImmediate: me,
  asap: ve,
  isIterable: ye
};
const be = he.toObjectSet(["age", "authorization", "content-length", "content-type", "etag", "expires", "from", "host", "if-modified-since", "if-unmodified-since", "last-modified", "location", "max-forwards", "proxy-authorization", "referer", "retry-after", "user-agent"]);
var we = e => {
  const t = {};
  let r;
  let n;
  let i;
  if (e) {
    e.split("\n").forEach(function (e) {
      i = e.indexOf(":");
      r = e.substring(0, i).trim().toLowerCase();
      n = e.substring(i + 1).trim();
      if (!!r && (!t[r] || !be[r])) {
        if (r === "set-cookie") {
          if (t[r]) {
            t[r].push(n);
          } else {
            t[r] = [n];
          }
        } else {
          t[r] = t[r] ? t[r] + ", " + n : n;
        }
      }
    });
  }
  return t;
};
function xe(e) {
  let t = 0;
  let r = e.length;
  while (t < r) {
    const r = e.charCodeAt(t);
    if (r !== 9 && r !== 32) {
      break;
    }
    t += 1;
  }
  while (r > t) {
    const t = e.charCodeAt(r - 1);
    if (t !== 9 && t !== 32) {
      break;
    }
    r -= 1;
  }
  if (t === 0 && r === e.length) {
    return e;
  } else {
    return e.slice(t, r);
  }
}
const Ee = new RegExp("[\\u0000-\\u0008\\u000a-\\u001f\\u007f]+", "g");
const ke = new RegExp("[^\\u0009\\u0020-\\u007e\\u0080-\\u00ff]+", "g");
function Se(e, t) {
  if (he.isArray(e)) {
    return e.map(e => Se(e, t));
  } else {
    return xe(String(e).replace(t, ""));
  }
}
const Te = e => Se(e, Ee);
const Ce = e => Se(e, ke);
function Ae(e) {
  const t = Object.create(null);
  he.forEach(e.toJSON(), (e, r) => {
    t[r] = Ce(e);
  });
  return t;
}
const _e = Symbol("internals");
function Oe(e) {
  return e && String(e).trim().toLowerCase();
}
function Me(e) {
  if (e === false || e == null) {
    return e;
  } else if (he.isArray(e)) {
    return e.map(Me);
  } else {
    return Te(String(e));
  }
}
function Pe(e) {
  const t = Object.create(null);
  const r = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let n;
  while (n = r.exec(e)) {
    t[n[1]] = n[2];
  }
  return t;
}
const qe = e => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(e.trim());
function Ne(e, t, r, n, i) {
  if (he.isFunction(n)) {
    return n.call(this, t, r);
  } else {
    if (i) {
      t = r;
    }
    if (he.isString(t)) {
      if (he.isString(n)) {
        return t.indexOf(n) !== -1;
      } else if (he.isRegExp(n)) {
        return n.test(t);
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
}
function Re(e) {
  return e.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (e, t, r) => t.toUpperCase() + r);
}
function Ie(e, t) {
  const r = he.toCamelCase(" " + t);
  ["get", "set", "has"].forEach(n => {
    Object.defineProperty(e, n + r, {
      __proto__: null,
      value: function (e, r, i) {
        return this[n].call(this, t, e, r, i);
      },
      configurable: true
    });
  });
}
class je {
  constructor(e) {
    if (e) {
      this.set(e);
    }
  }
  set(e, t, r) {
    const n = this;
    function i(e, t, r) {
      const i = Oe(t);
      if (!i) {
        throw new Error("header name must be a non-empty string");
      }
      const o = he.findKey(n, i);
      if (!o || n[o] === undefined || r === true || r === undefined && n[o] !== false) {
        n[o || t] = Me(e);
      }
    }
    const o = (e, t) => he.forEach(e, (e, r) => i(e, r, t));
    if (he.isPlainObject(e) || e instanceof this.constructor) {
      o(e, t);
    } else if (he.isString(e) && (e = e.trim()) && !qe(e)) {
      o(we(e), t);
    } else if (he.isObject(e) && he.isIterable(e)) {
      let r;
      let n;
      let i = {};
      for (const t of e) {
        if (!he.isArray(t)) {
          throw TypeError("Object iterator must return a key-value pair");
        }
        i[n = t[0]] = (r = i[n]) ? he.isArray(r) ? [...r, t[1]] : [r, t[1]] : t[1];
      }
      o(i, t);
    } else if (e != null) {
      i(t, e, r);
    }
    return this;
  }
  get(e, t) {
    e = Oe(e);
    if (e) {
      const r = he.findKey(this, e);
      if (r) {
        const e = this[r];
        if (!t) {
          return e;
        }
        if (t === true) {
          return Pe(e);
        }
        if (he.isFunction(t)) {
          return t.call(this, e, r);
        }
        if (he.isRegExp(t)) {
          return t.exec(e);
        }
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(e, t) {
    e = Oe(e);
    if (e) {
      const r = he.findKey(this, e);
      return !!r && this[r] !== undefined && (!t || !!Ne(this, this[r], r, t));
    }
    return false;
  }
  delete(e, t) {
    const r = this;
    let n = false;
    function i(e) {
      e = Oe(e);
      if (e) {
        const i = he.findKey(r, e);
        if (!!i && (!t || !!Ne(r, r[i], i, t))) {
          delete r[i];
          n = true;
        }
      }
    }
    if (he.isArray(e)) {
      e.forEach(i);
    } else {
      i(e);
    }
    return n;
  }
  clear(e) {
    const t = Object.keys(this);
    let r = t.length;
    let n = false;
    while (r--) {
      const i = t[r];
      if (!e || !!Ne(this, this[i], i, e, true)) {
        delete this[i];
        n = true;
      }
    }
    return n;
  }
  normalize(e) {
    const t = this;
    const r = {};
    he.forEach(this, (n, i) => {
      const o = he.findKey(r, i);
      if (o) {
        t[o] = Me(n);
        delete t[i];
        return;
      }
      const a = e ? Re(i) : String(i).trim();
      if (a !== i) {
        delete t[i];
      }
      t[a] = Me(n);
      r[a] = true;
    });
    return this;
  }
  concat(...e) {
    return this.constructor.concat(this, ...e);
  }
  toJSON(e) {
    const t = Object.create(null);
    he.forEach(this, (r, n) => {
      if (r != null && r !== false) {
        t[n] = e && he.isArray(r) ? r.join(", ") : r;
      }
    });
    return t;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([e, t]) => e + ": " + t).join("\n");
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(e) {
    if (e instanceof this) {
      return e;
    } else {
      return new this(e);
    }
  }
  static concat(e, ...t) {
    const r = new this(e);
    t.forEach(e => r.set(e));
    return r;
  }
  static accessor(e) {
    const t = this[_e] = this[_e] = {
      accessors: {}
    };
    const r = t.accessors;
    const n = this.prototype;
    function i(e) {
      const t = Oe(e);
      if (!r[t]) {
        Ie(n, e);
        r[t] = true;
      }
    }
    if (he.isArray(e)) {
      e.forEach(i);
    } else {
      i(e);
    }
    return this;
  }
}
je.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
he.reduceDescriptors(je.prototype, ({
  value: e
}, t) => {
  let r = t[0].toUpperCase() + t.slice(1);
  return {
    get: () => e,
    set(e) {
      this[r] = e;
    }
  };
});
he.freezeMethods(je);
var De = je;
const Le = "[REDACTED ****]";
function Fe(e) {
  if (he.hasOwnProp(e, "toJSON")) {
    return true;
  }
  let t = Object.getPrototypeOf(e);
  while (t && t !== Object.prototype) {
    if (he.hasOwnProp(t, "toJSON")) {
      return true;
    }
    t = Object.getPrototypeOf(t);
  }
  return false;
}
function Ze(e, t) {
  const r = new Set(t.map(e => String(e).toLowerCase()));
  const n = [];
  const i = e => {
    if (e === null || typeof e !== "object") {
      return e;
    }
    if (he.isBuffer(e)) {
      return e;
    }
    if (n.indexOf(e) !== -1) {
      return;
    }
    let t;
    if (e instanceof De) {
      e = e.toJSON();
    }
    n.push(e);
    if (he.isArray(e)) {
      t = [];
      e.forEach((e, r) => {
        const n = i(e);
        if (!he.isUndefined(n)) {
          t[r] = n;
        }
      });
    } else {
      if (!he.isPlainObject(e) && Fe(e)) {
        n.pop();
        return e;
      }
      t = Object.create(null);
      for (const [n, o] of Object.entries(e)) {
        const e = r.has(n.toLowerCase()) ? Le : i(o);
        if (!he.isUndefined(e)) {
          t[n] = e;
        }
      }
    }
    n.pop();
    return t;
  };
  return i(e);
}
class ze extends Error {
  static from(e, t, r, n, i, o) {
    const a = new ze(e.message, t || e.code, r, n, i);
    a.cause = e;
    a.name = e.name;
    if (e.status != null && a.status == null) {
      a.status = e.status;
    }
    if (o) {
      Object.assign(a, o);
    }
    return a;
  }
  constructor(e, t, r, n, i) {
    super(e);
    Object.defineProperty(this, "message", {
      __proto__: null,
      value: e,
      enumerable: true,
      writable: true,
      configurable: true
    });
    this.name = "AxiosError";
    this.isAxiosError = true;
    if (t) {
      this.code = t;
    }
    if (r) {
      this.config = r;
    }
    if (n) {
      this.request = n;
    }
    if (i) {
      this.response = i;
      this.status = i.status;
    }
  }
  toJSON() {
    const e = this.config;
    const t = e && he.hasOwnProp(e, "redact") ? e.redact : undefined;
    const r = he.isArray(t) && t.length > 0 ? Ze(e, t) : he.toJSONObject(e);
    return {
      message: this.message,
      name: this.name,
      description: this.description,
      number: this.number,
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      config: r,
      code: this.code,
      status: this.status
    };
  }
}
ze.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
ze.ERR_BAD_OPTION = "ERR_BAD_OPTION";
ze.ECONNABORTED = "ECONNABORTED";
ze.ETIMEDOUT = "ETIMEDOUT";
ze.ECONNREFUSED = "ECONNREFUSED";
ze.ERR_NETWORK = "ERR_NETWORK";
ze.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
ze.ERR_DEPRECATED = "ERR_DEPRECATED";
ze.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
ze.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
ze.ERR_CANCELED = "ERR_CANCELED";
ze.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
ze.ERR_INVALID_URL = "ERR_INVALID_URL";
ze.ERR_FORM_DATA_DEPTH_EXCEEDED = "ERR_FORM_DATA_DEPTH_EXCEEDED";
var Ue = ze;
var Be = null;
var Ve = require("./91620.js").Buffer;
function He(e) {
  return he.isPlainObject(e) || he.isArray(e);
}
function We(e) {
  if (he.endsWith(e, "[]")) {
    return e.slice(0, -2);
  } else {
    return e;
  }
}
function Ye(e, t, r) {
  if (e) {
    return e.concat(t).map(function (e, t) {
      e = We(e);
      if (!r && t) {
        return "[" + e + "]";
      } else {
        return e;
      }
    }).join(r ? "." : "");
  } else {
    return t;
  }
}
function Qe(e) {
  return he.isArray(e) && !e.some(He);
}
const $e = he.toFlatObject(he, {}, null, function (e) {
  return /^is[A-Z]/.test(e);
});
function Ge(e, t, r) {
  if (!he.isObject(e)) {
    throw new TypeError("target must be an object");
  }
  t = t || new (Be || FormData)();
  r = he.toFlatObject(r, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, function (e, t) {
    return !he.isUndefined(t[e]);
  });
  const n = r.metaTokens;
  const i = r.visitor || p;
  const o = r.dots;
  const a = r.indexes;
  const s = r.Blob || typeof Blob !== "undefined" && Blob;
  const u = r.maxDepth === undefined ? 100 : r.maxDepth;
  const l = s && he.isSpecCompliantForm(t);
  if (!he.isFunction(i)) {
    throw new TypeError("visitor must be a function");
  }
  function c(e) {
    if (e === null) {
      return "";
    }
    if (he.isDate(e)) {
      return e.toISOString();
    }
    if (he.isBoolean(e)) {
      return e.toString();
    }
    if (!l && he.isBlob(e)) {
      throw new Ue("Blob is not supported. Use a Buffer instead.");
    }
    if (he.isArrayBuffer(e) || he.isTypedArray(e)) {
      if (l && typeof Blob === "function") {
        return new Blob([e]);
      } else {
        return Ve.from(e);
      }
    } else {
      return e;
    }
  }
  function p(e, r, i) {
    let s = e;
    if (he.isReactNative(t) && he.isReactNativeBlob(e)) {
      t.append(Ye(i, r, o), c(e));
      return false;
    }
    if (e && !i && typeof e === "object") {
      if (he.endsWith(r, "{}")) {
        r = n ? r : r.slice(0, -2);
        e = JSON.stringify(e);
      } else if (he.isArray(e) && Qe(e) || (he.isFileList(e) || he.endsWith(r, "[]")) && (s = he.toArray(e))) {
        r = We(r);
        s.forEach(function (e, n) {
          if (!he.isUndefined(e) && e !== null) {
            t.append(a === true ? Ye([r], n, o) : a === null ? r : r + "[]", c(e));
          }
        });
        return false;
      }
    }
    return !!He(e) || (t.append(Ye(i, r, o), c(e)), false);
  }
  const d = [];
  const f = Object.assign($e, {
    defaultVisitor: p,
    convertValue: c,
    isVisitable: He
  });
  function g(e, r, n = 0) {
    if (!he.isUndefined(e)) {
      if (n > u) {
        throw new Ue("Object is too deeply nested (" + n + " levels). Max depth: " + u, Ue.ERR_FORM_DATA_DEPTH_EXCEEDED);
      }
      if (d.indexOf(e) !== -1) {
        throw Error("Circular reference detected in " + r.join("."));
      }
      d.push(e);
      he.forEach(e, function (e, o) {
        const a = !he.isUndefined(e) && e !== null && i.call(t, e, he.isString(o) ? o.trim() : o, r, f);
        if (a === true) {
          g(e, r ? r.concat(o) : [o], n + 1);
        }
      });
      d.pop();
    }
  }
  if (!he.isObject(e)) {
    throw new TypeError("data must be an object");
  }
  g(e);
  return t;
}
var Ke = Ge;
function Je(e) {
  const t = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+"
  };
  return encodeURIComponent(e).replace(/[!'()~]|%20/g, function (e) {
    return t[e];
  });
}
function Xe(e, t) {
  this._pairs = [];
  if (e) {
    Ke(e, this, t);
  }
}
const et = Xe.prototype;
et.append = function (e, t) {
  this._pairs.push([e, t]);
};
et.toString = function (e) {
  const t = e ? function (t) {
    return e.call(this, t, Je);
  } : Je;
  return this._pairs.map(function (e) {
    return t(e[0]) + "=" + t(e[1]);
  }, "").join("&");
};
var tt = Xe;
function rt(e) {
  return encodeURIComponent(e).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function nt(e, t, r) {
  if (!t) {
    return e;
  }
  const n = r && r.encode || rt;
  const i = he.isFunction(r) ? {
    serialize: r
  } : r;
  const o = i && i.serialize;
  let a;
  a = o ? o(t, i) : he.isURLSearchParams(t) ? t.toString() : new tt(t, i).toString(n);
  if (a) {
    const t = e.indexOf("#");
    if (t !== -1) {
      e = e.slice(0, t);
    }
    e += (e.indexOf("?") === -1 ? "?" : "&") + a;
  }
  return e;
}
class it {
  constructor() {
    this.handlers = [];
  }
  use(e, t, r) {
    this.handlers.push({
      fulfilled: e,
      rejected: t,
      synchronous: !!r && r.synchronous,
      runWhen: r ? r.runWhen : null
    });
    return this.handlers.length - 1;
  }
  eject(e) {
    this.handlers[e] &&= null;
  }
  clear() {
    this.handlers &&= [];
  }
  forEach(e) {
    he.forEach(this.handlers, function (t) {
      if (t !== null) {
        e(t);
      }
    });
  }
}
var ot = it;
var at = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false,
  legacyInterceptorReqResOrdering: true
};
var st = typeof URLSearchParams !== "undefined" ? URLSearchParams : tt;
var ut = typeof FormData !== "undefined" ? FormData : null;
var lt = typeof Blob !== "undefined" ? Blob : null;
var ct = {
  isBrowser: true,
  classes: {
    URLSearchParams: st,
    FormData: ut,
    Blob: lt
  },
  protocols: ["http", "https", "file", "blob", "url", "data"]
};
const pt = typeof window !== "undefined" && typeof document !== "undefined";
const dt = typeof navigator === "object" && navigator || undefined;
const ft = pt && (!dt || ["ReactNative", "NativeScript", "NS"].indexOf(dt.product) < 0);
const gt = (() => typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope && typeof self.importScripts === "function")();
const mt = pt && window.location.href || "http://localhost";
var vt = {
  ...n,
  ...ct
};
function yt(e, t) {
  return Ke(e, new vt.classes.URLSearchParams(), {
    visitor: function (e, t, r, n) {
      if (vt.isNode && he.isBuffer(e)) {
        this.append(t, e.toString("base64"));
        return false;
      } else {
        return n.defaultVisitor.apply(this, arguments);
      }
    },
    ...t
  });
}
function ht(e) {
  return he.matchAll(/\w+|\[(\w*)]/g, e).map(e => e[0] === "[]" ? "" : e[1] || e[0]);
}
function bt(e) {
  const t = {};
  const r = Object.keys(e);
  let n;
  const i = r.length;
  let o;
  for (n = 0; n < i; n++) {
    o = r[n];
    t[o] = e[o];
  }
  return t;
}
function wt(e) {
  function t(e, r, n, i) {
    let o = e[i++];
    if (o === "__proto__") {
      return true;
    }
    const a = Number.isFinite(+o);
    const s = i >= e.length;
    o = !o && he.isArray(n) ? n.length : o;
    if (s) {
      if (he.hasOwnProp(n, o)) {
        n[o] = he.isArray(n[o]) ? n[o].concat(r) : [n[o], r];
      } else {
        n[o] = r;
      }
      return !a;
    }
    if (!he.hasOwnProp(n, o) || !he.isObject(n[o])) {
      n[o] = [];
    }
    const u = t(e, r, n[o], i);
    if (u && he.isArray(n[o])) {
      n[o] = bt(n[o]);
    }
    return !a;
  }
  if (he.isFormData(e) && he.isFunction(e.entries)) {
    const r = {};
    he.forEachEntry(e, (e, n) => {
      t(ht(e), n, r, 0);
    });
    return r;
  }
  return null;
}
var xt = wt;
const Et = (e, t) => e != null && he.hasOwnProp(e, t) ? e[t] : undefined;
function kt(e, t, r) {
  if (he.isString(e)) {
    try {
      (t || JSON.parse)(e);
      return he.trim(e);
    } catch (n) {
      if (n.name !== "SyntaxError") {
        throw n;
      }
    }
  }
  return (r || JSON.stringify)(e);
}
const St = {
  transitional: at,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [function (e, t) {
    const r = t.getContentType() || "";
    const n = r.indexOf("application/json") > -1;
    const i = he.isObject(e);
    if (i && he.isHTMLForm(e)) {
      e = new FormData(e);
    }
    const o = he.isFormData(e);
    if (o) {
      if (n) {
        return JSON.stringify(xt(e));
      } else {
        return e;
      }
    }
    if (he.isArrayBuffer(e) || he.isBuffer(e) || he.isStream(e) || he.isFile(e) || he.isBlob(e) || he.isReadableStream(e)) {
      return e;
    }
    if (he.isArrayBufferView(e)) {
      return e.buffer;
    }
    if (he.isURLSearchParams(e)) {
      t.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
      return e.toString();
    }
    let a;
    if (i) {
      const t = Et(this, "formSerializer");
      if (r.indexOf("application/x-www-form-urlencoded") > -1) {
        return yt(e, t).toString();
      }
      if ((a = he.isFileList(e)) || r.indexOf("multipart/form-data") > -1) {
        const r = Et(this, "env");
        const n = r && r.FormData;
        return Ke(a ? {
          "files[]": e
        } : e, n && new n(), t);
      }
    }
    if (i || n) {
      t.setContentType("application/json", false);
      return kt(e);
    } else {
      return e;
    }
  }],
  transformResponse: [function (e) {
    const t = Et(this, "transitional") || St.transitional;
    const r = t && t.forcedJSONParsing;
    const n = Et(this, "responseType");
    const i = n === "json";
    if (he.isResponse(e) || he.isReadableStream(e)) {
      return e;
    }
    if (e && he.isString(e) && (r && !n || i)) {
      const r = t && t.silentJSONParsing;
      const n = !r && i;
      try {
        return JSON.parse(e, Et(this, "parseReviver"));
      } catch (o) {
        if (n) {
          if (o.name === "SyntaxError") {
            throw Ue.from(o, Ue.ERR_BAD_RESPONSE, this, null, Et(this, "response"));
          }
          throw o;
        }
      }
    }
    return e;
  }],
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: vt.classes.FormData,
    Blob: vt.classes.Blob
  },
  validateStatus: function (e) {
    return e >= 200 && e < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": undefined
    }
  }
};
he.forEach(["delete", "get", "head", "post", "put", "patch", "query"], e => {
  St.headers[e] = {};
});
var Tt = St;
function Ct(e, t) {
  const r = this || Tt;
  const n = t || r;
  const i = De.from(n.headers);
  let o = n.data;
  he.forEach(e, function (e) {
    o = e.call(r, o, i.normalize(), t ? t.status : undefined);
  });
  i.normalize();
  return o;
}
function At(e) {
  return !!e && !!e.__CANCEL__;
}
class _t extends Ue {
  constructor(e, t, r) {
    super(e == null ? "canceled" : e, Ue.ERR_CANCELED, t, r);
    this.name = "CanceledError";
    this.__CANCEL__ = true;
  }
}
var Ot = _t;
function Mt(e, t, r) {
  const n = r.config.validateStatus;
  if (r.status && n && !n(r.status)) {
    t(new Ue("Request failed with status code " + r.status, r.status >= 400 && r.status < 500 ? Ue.ERR_BAD_REQUEST : Ue.ERR_BAD_RESPONSE, r.config, r.request, r));
  } else {
    e(r);
  }
}
function Pt(e) {
  const t = /^([-+\w]{1,25}):(?:\/\/)?/.exec(e);
  return t && t[1] || "";
}
function qt(e, t) {
  e = e || 10;
  const r = new Array(e);
  const n = new Array(e);
  let i;
  let o = 0;
  let a = 0;
  t = t !== undefined ? t : 1000;
  return function (s) {
    const u = Date.now();
    const l = n[a];
    i ||= u;
    r[o] = s;
    n[o] = u;
    let c = a;
    let p = 0;
    while (c !== o) {
      p += r[c++];
      c %= e;
    }
    o = (o + 1) % e;
    if (o === a) {
      a = (a + 1) % e;
    }
    if (u - i < t) {
      return;
    }
    const d = l && u - l;
    if (d) {
      return Math.round(p * 1000 / d);
    } else {
      return undefined;
    }
  };
}
var Nt = qt;
function Rt(e, t) {
  let r;
  let n;
  let i = 0;
  let o = 1000 / t;
  const a = (t, o = Date.now()) => {
    i = o;
    r = null;
    if (n) {
      clearTimeout(n);
      n = null;
    }
    e(...t);
  };
  const s = (...e) => {
    const t = Date.now();
    const s = t - i;
    if (s >= o) {
      a(e, t);
    } else {
      r = e;
      n ||= setTimeout(() => {
        n = null;
        a(r);
      }, o - s);
    }
  };
  const u = () => r && a(r);
  return [s, u];
}
var It = Rt;
const jt = (e, t, r = 3) => {
  let n = 0;
  const i = Nt(50, 250);
  return It(r => {
    if (!r || typeof r.loaded !== "number") {
      return;
    }
    const o = r.loaded;
    const a = r.lengthComputable ? r.total : undefined;
    const s = a != null ? Math.min(o, a) : o;
    const u = Math.max(0, s - n);
    const l = i(u);
    n = Math.max(n, s);
    const c = {
      loaded: s,
      total: a,
      progress: a ? s / a : undefined,
      bytes: u,
      rate: l || undefined,
      estimated: l && a ? (a - s) / l : undefined,
      event: r,
      lengthComputable: a != null,
      [t ? "download" : "upload"]: true
    };
    e(c);
  }, r);
};
const Dt = (e, t) => {
  const r = e != null;
  return [n => t[0]({
    lengthComputable: r,
    total: e,
    loaded: n
  }), t[1]];
};
const Lt = e => (...t) => he.asap(() => e(...t));
var Ft = vt.hasStandardBrowserEnv ? ((e, t) => r => {
  r = new URL(r, vt.origin);
  return e.protocol === r.protocol && e.host === r.host && (t || e.port === r.port);
})(new URL(vt.origin), vt.navigator && /(msie|trident)/i.test(vt.navigator.userAgent)) : () => true;
var Zt = vt.hasStandardBrowserEnv ? {
  write(e, t, r, n, i, o, a) {
    if (typeof document === "undefined") {
      return;
    }
    const s = [`${e}=${encodeURIComponent(t)}`];
    if (he.isNumber(r)) {
      s.push(`expires=${new Date(r).toUTCString()}`);
    }
    if (he.isString(n)) {
      s.push(`path=${n}`);
    }
    if (he.isString(i)) {
      s.push(`domain=${i}`);
    }
    if (o === true) {
      s.push("secure");
    }
    if (he.isString(a)) {
      s.push(`SameSite=${a}`);
    }
    document.cookie = s.join("; ");
  },
  read(e) {
    if (typeof document === "undefined") {
      return null;
    }
    const t = document.cookie.split(";");
    for (let r = 0; r < t.length; r++) {
      const n = t[r].replace(/^\s+/, "");
      const i = n.indexOf("=");
      if (i !== -1 && n.slice(0, i) === e) {
        return decodeURIComponent(n.slice(i + 1));
      }
    }
    return null;
  },
  remove(e) {
    this.write(e, "", Date.now() - 86400000, "/");
  }
} : {
  write() {},
  read() {
    return null;
  },
  remove() {}
};
function zt(e) {
  return typeof e === "string" && /^([a-z][a-z\d+\-.]*:)?\/\//i.test(e);
}
function Ut(e, t) {
  if (t) {
    return e.replace(/\/?\/$/, "") + "/" + t.replace(/^\/+/, "");
  } else {
    return e;
  }
}
function Bt(e, t, r) {
  let n = !zt(t);
  if (e && (n || r === false)) {
    return Ut(e, t);
  } else {
    return t;
  }
}
const Vt = e => e instanceof De ? {
  ...e
} : e;
function Ht(e, t) {
  t = t || {};
  const r = Object.create(null);
  function n(e, t, r, n) {
    if (he.isPlainObject(e) && he.isPlainObject(t)) {
      return he.merge.call({
        caseless: n
      }, e, t);
    } else if (he.isPlainObject(t)) {
      return he.merge({}, t);
    } else if (he.isArray(t)) {
      return t.slice();
    } else {
      return t;
    }
  }
  function i(e, t, r, i) {
    if (he.isUndefined(t)) {
      if (he.isUndefined(e)) {
        return undefined;
      } else {
        return n(undefined, e, r, i);
      }
    } else {
      return n(e, t, r, i);
    }
  }
  function o(e, t) {
    if (!he.isUndefined(t)) {
      return n(undefined, t);
    }
  }
  function a(e, t) {
    if (he.isUndefined(t)) {
      if (he.isUndefined(e)) {
        return undefined;
      } else {
        return n(undefined, e);
      }
    } else {
      return n(undefined, t);
    }
  }
  function s(r, i, o) {
    if (he.hasOwnProp(t, o)) {
      return n(r, i);
    } else if (he.hasOwnProp(e, o)) {
      return n(undefined, r);
    } else {
      return undefined;
    }
  }
  Object.defineProperty(r, "hasOwnProperty", {
    __proto__: null,
    value: Object.prototype.hasOwnProperty,
    enumerable: false,
    writable: true,
    configurable: true
  });
  const u = {
    url: o,
    method: o,
    data: o,
    baseURL: a,
    transformRequest: a,
    transformResponse: a,
    paramsSerializer: a,
    timeout: a,
    timeoutMessage: a,
    withCredentials: a,
    withXSRFToken: a,
    adapter: a,
    responseType: a,
    xsrfCookieName: a,
    xsrfHeaderName: a,
    onUploadProgress: a,
    onDownloadProgress: a,
    decompress: a,
    maxContentLength: a,
    maxBodyLength: a,
    beforeRedirect: a,
    transport: a,
    httpAgent: a,
    httpsAgent: a,
    cancelToken: a,
    socketPath: a,
    allowedSocketPaths: a,
    responseEncoding: a,
    validateStatus: s,
    headers: (e, t, r) => i(Vt(e), Vt(t), r, true)
  };
  he.forEach(Object.keys({
    ...e,
    ...t
  }), function (n) {
    if (n === "__proto__" || n === "constructor" || n === "prototype") {
      return;
    }
    const o = he.hasOwnProp(u, n) ? u[n] : i;
    const a = he.hasOwnProp(e, n) ? e[n] : undefined;
    const l = he.hasOwnProp(t, n) ? t[n] : undefined;
    const c = o(a, l, n);
    if (!he.isUndefined(c) || o === s) {
      r[n] = c;
    }
  });
  return r;
}
const Wt = ["content-type", "content-length"];
function Yt(e, t, r) {
  if (r === "content-only") {
    Object.entries(t).forEach(([t, r]) => {
      if (Wt.includes(t.toLowerCase())) {
        e.set(t, r);
      }
    });
  } else {
    e.set(t);
  }
}
const Qt = e => encodeURIComponent(e).replace(/%([0-9A-F]{2})/gi, (e, t) => String.fromCharCode(parseInt(t, 16)));
var $t = e => {
  const t = Ht({}, e);
  const r = e => he.hasOwnProp(t, e) ? t[e] : undefined;
  const n = r("data");
  let i = r("withXSRFToken");
  const o = r("xsrfHeaderName");
  const a = r("xsrfCookieName");
  let s = r("headers");
  const u = r("auth");
  const l = r("baseURL");
  const c = r("allowAbsoluteUrls");
  const p = r("url");
  t.headers = s = De.from(s);
  t.url = nt(Bt(l, p, c), e.params, e.paramsSerializer);
  if (u) {
    s.set("Authorization", "Basic " + btoa((u.username || "") + ":" + (u.password ? Qt(u.password) : "")));
  }
  if (he.isFormData(n)) {
    if (vt.hasStandardBrowserEnv || vt.hasStandardBrowserWebWorkerEnv) {
      s.setContentType(undefined);
    } else if (he.isFunction(n.getHeaders)) {
      Yt(s, n.getHeaders(), r("formDataHeaderPolicy"));
    }
  }
  if (vt.hasStandardBrowserEnv) {
    if (he.isFunction(i)) {
      i = i(t);
    }
    const e = i === true || i == null && Ft(t.url);
    if (e) {
      const e = o && a && Zt.read(a);
      if (e) {
        s.set(o, e);
      }
    }
  }
  return t;
};
const Gt = typeof XMLHttpRequest !== "undefined";
var Kt = Gt && function (e) {
  return new Promise(function (t, r) {
    const n = $t(e);
    let i = n.data;
    const o = De.from(n.headers).normalize();
    let a;
    let s;
    let u;
    let l;
    let c;
    let {
      responseType: p,
      onUploadProgress: d,
      onDownloadProgress: f
    } = n;
    function g() {
      if (l) {
        l();
      }
      if (c) {
        c();
      }
      if (n.cancelToken) {
        n.cancelToken.unsubscribe(a);
      }
      if (n.signal) {
        n.signal.removeEventListener("abort", a);
      }
    }
    let m = new XMLHttpRequest();
    function v() {
      if (!m) {
        return;
      }
      const n = De.from("getAllResponseHeaders" in m && m.getAllResponseHeaders());
      const i = p && p !== "text" && p !== "json" ? m.response : m.responseText;
      const o = {
        data: i,
        status: m.status,
        statusText: m.statusText,
        headers: n,
        config: e,
        request: m
      };
      Mt(function (e) {
        t(e);
        g();
      }, function (e) {
        r(e);
        g();
      }, o);
      m = null;
    }
    m.open(n.method.toUpperCase(), n.url, true);
    m.timeout = n.timeout;
    if ("onloadend" in m) {
      m.onloadend = v;
    } else {
      m.onreadystatechange = function () {
        if (m && m.readyState === 4 && (m.status !== 0 || m.responseURL && m.responseURL.startsWith("file:"))) {
          setTimeout(v);
        }
      };
    }
    m.onabort = function () {
      if (m) {
        r(new Ue("Request aborted", Ue.ECONNABORTED, e, m));
        g();
        m = null;
      }
    };
    m.onerror = function (t) {
      const n = t && t.message ? t.message : "Network Error";
      const i = new Ue(n, Ue.ERR_NETWORK, e, m);
      i.event = t || null;
      r(i);
      g();
      m = null;
    };
    m.ontimeout = function () {
      let t = n.timeout ? "timeout of " + n.timeout + "ms exceeded" : "timeout exceeded";
      const i = n.transitional || at;
      if (n.timeoutErrorMessage) {
        t = n.timeoutErrorMessage;
      }
      r(new Ue(t, i.clarifyTimeoutError ? Ue.ETIMEDOUT : Ue.ECONNABORTED, e, m));
      g();
      m = null;
    };
    if (i === undefined) {
      o.setContentType(null);
    }
    if ("setRequestHeader" in m) {
      he.forEach(Ae(o), function (e, t) {
        m.setRequestHeader(t, e);
      });
    }
    if (!he.isUndefined(n.withCredentials)) {
      m.withCredentials = !!n.withCredentials;
    }
    if (p && p !== "json") {
      m.responseType = n.responseType;
    }
    if (f) {
      [u, c] = jt(f, true);
      m.addEventListener("progress", u);
    }
    if (d && m.upload) {
      [s, l] = jt(d);
      m.upload.addEventListener("progress", s);
      m.upload.addEventListener("loadend", l);
    }
    if (n.cancelToken || n.signal) {
      a = t => {
        if (m) {
          r(!t || t.type ? new Ot(null, e, m) : t);
          m.abort();
          g();
          m = null;
        }
      };
      if (n.cancelToken) {
        n.cancelToken.subscribe(a);
      }
      if (n.signal) {
        if (n.signal.aborted) {
          a();
        } else {
          n.signal.addEventListener("abort", a);
        }
      }
    }
    const y = Pt(n.url);
    if (!y || vt.protocols.includes(y)) {
      m.send(i || null);
    } else {
      r(new Ue("Unsupported protocol " + y + ":", Ue.ERR_BAD_REQUEST, e));
    }
  });
};
const Jt = (e, t) => {
  e = e ? e.filter(Boolean) : [];
  if (!t && !e.length) {
    return;
  }
  const r = new AbortController();
  let n = false;
  const i = function (e) {
    if (!n) {
      n = true;
      a();
      const t = e instanceof Error ? e : this.reason;
      r.abort(t instanceof Ue ? t : new Ot(t instanceof Error ? t.message : t));
    }
  };
  let o = t && setTimeout(() => {
    o = null;
    i(new Ue(`timeout of ${t}ms exceeded`, Ue.ETIMEDOUT));
  }, t);
  const a = () => {
    if (e) {
      if (o) {
        clearTimeout(o);
      }
      o = null;
      e.forEach(e => {
        if (e.unsubscribe) {
          e.unsubscribe(i);
        } else {
          e.removeEventListener("abort", i);
        }
      });
      e = null;
    }
  };
  e.forEach(e => e.addEventListener("abort", i));
  const {
    signal: s
  } = r;
  s.unsubscribe = () => he.asap(a);
  return s;
};
var Xt = Jt;
const er = function* (e, t) {
  let r = e.byteLength;
  if (!t || r < t) {
    yield e;
    return;
  }
  let n;
  let i = 0;
  while (i < r) {
    n = i + t;
    yield e.slice(i, n);
    i = n;
  }
};
const tr = async function* (e, t) {
  for await (const r of rr(e)) {
    yield* er(r, t);
  }
};
const rr = async function* (e) {
  if (e[Symbol.asyncIterator]) {
    yield* e;
    return;
  }
  const t = e.getReader();
  try {
    while (true) {
      const {
        done: e,
        value: r
      } = await t.read();
      if (e) {
        break;
      }
      yield r;
    }
  } finally {
    await t.cancel();
  }
};
const nr = (e, t, r, n) => {
  const i = tr(e, t);
  let o;
  let a = 0;
  let s = e => {
    if (!o) {
      o = true;
      if (n) {
        n(e);
      }
    }
  };
  return new ReadableStream({
    async pull(e) {
      try {
        const {
          done: t,
          value: n
        } = await i.next();
        if (t) {
          s();
          e.close();
          return;
        }
        let o = n.byteLength;
        if (r) {
          let e = a += o;
          r(e);
        }
        e.enqueue(new Uint8Array(n));
      } catch (t) {
        s(t);
        throw t;
      }
    },
    cancel(e) {
      s(e);
      return i.return();
    }
  }, {
    highWaterMark: 2
  });
};
var ir = require("./91620.js").Buffer;
function or(e) {
  if (!e || typeof e !== "string") {
    return 0;
  }
  if (!e.startsWith("data:")) {
    return 0;
  }
  const t = e.indexOf(",");
  if (t < 0) {
    return 0;
  }
  const r = e.slice(5, t);
  const n = e.slice(t + 1);
  const i = /;base64/i.test(r);
  if (i) {
    let e = n.length;
    const t = n.length;
    for (let u = 0; u < t; u++) {
      if (n.charCodeAt(u) === 37 && u + 2 < t) {
        const t = n.charCodeAt(u + 1);
        const r = n.charCodeAt(u + 2);
        const i = (t >= 48 && t <= 57 || t >= 65 && t <= 70 || t >= 97 && t <= 102) && (r >= 48 && r <= 57 || r >= 65 && r <= 70 || r >= 97 && r <= 102);
        if (i) {
          e -= 2;
          u += 2;
        }
      }
    }
    let r = 0;
    let i = t - 1;
    const o = e => e >= 2 && n.charCodeAt(e - 2) === 37 && n.charCodeAt(e - 1) === 51 && (n.charCodeAt(e) === 68 || n.charCodeAt(e) === 100);
    if (i >= 0) {
      if (n.charCodeAt(i) === 61) {
        r++;
        i--;
      } else if (o(i)) {
        r++;
        i -= 3;
      }
    }
    if (r === 1 && i >= 0 && (n.charCodeAt(i) === 61 || o(i))) {
      r++;
    }
    const a = Math.floor(e / 4);
    const s = a * 3 - (r || 0);
    if (s > 0) {
      return s;
    } else {
      return 0;
    }
  }
  if (typeof ir !== "undefined" && typeof ir.byteLength === "function") {
    return ir.byteLength(n, "utf8");
  }
  let o = 0;
  for (let a = 0, s = n.length; a < s; a++) {
    const e = n.charCodeAt(a);
    if (e < 128) {
      o += 1;
    } else if (e < 2048) {
      o += 2;
    } else if (e >= 55296 && e <= 56319 && a + 1 < s) {
      const e = n.charCodeAt(a + 1);
      if (e >= 56320 && e <= 57343) {
        o += 4;
        a++;
      } else {
        o += 3;
      }
    } else {
      o += 3;
    }
  }
  return o;
}
const ar = "1.16.1";
const sr = 65536;
const {
  isFunction: ur
} = he;
const lr = (e, ...t) => {
  try {
    return !!e(...t);
  } catch (r) {
    return false;
  }
};
const cr = e => {
  const t = he.global !== undefined && he.global !== null ? he.global : globalThis;
  const {
    ReadableStream: r,
    TextEncoder: n
  } = t;
  e = he.merge.call({
    skipUndefined: true
  }, {
    Request: t.Request,
    Response: t.Response
  }, e);
  const {
    fetch: i,
    Request: o,
    Response: a
  } = e;
  const s = i ? ur(i) : typeof fetch === "function";
  const u = ur(o);
  const l = ur(a);
  if (!s) {
    return false;
  }
  const c = s && ur(r);
  const p = s && (typeof n === "function" ? (e => t => e.encode(t))(new n()) : async e => new Uint8Array(await new o(e).arrayBuffer()));
  const d = u && c && lr(() => {
    let e = false;
    const t = new o(vt.origin, {
      body: new r(),
      method: "POST",
      get duplex() {
        e = true;
        return "half";
      }
    });
    const n = t.headers.has("Content-Type");
    if (t.body != null) {
      t.body.cancel();
    }
    return e && !n;
  });
  const f = l && c && lr(() => he.isReadableStream(new a("").body));
  const g = {
    stream: f && (e => e.body)
  };
  if (s) {
    (() => {
      ["text", "arrayBuffer", "blob", "formData", "stream"].forEach(e => {
        if (!g[e]) {
          g[e] = (t, r) => {
            let n = t && t[e];
            if (n) {
              return n.call(t);
            }
            throw new Ue(`Response type '${e}' is not supported`, Ue.ERR_NOT_SUPPORT, r);
          };
        }
      });
    })();
  }
  const m = async e => {
    if (e == null) {
      return 0;
    }
    if (he.isBlob(e)) {
      return e.size;
    }
    if (he.isSpecCompliantForm(e)) {
      const t = new o(vt.origin, {
        method: "POST",
        body: e
      });
      return (await t.arrayBuffer()).byteLength;
    }
    if (he.isArrayBufferView(e) || he.isArrayBuffer(e)) {
      return e.byteLength;
    } else {
      if (he.isURLSearchParams(e)) {
        e += "";
      }
      if (he.isString(e)) {
        return (await p(e)).byteLength;
      } else {
        return undefined;
      }
    }
  };
  const v = async (e, t) => {
    const r = he.toFiniteNumber(e.getContentLength());
    if (r == null) {
      return m(t);
    } else {
      return r;
    }
  };
  return async e => {
    let {
      url: t,
      method: r,
      data: s,
      signal: l,
      cancelToken: c,
      timeout: p,
      onDownloadProgress: m,
      onUploadProgress: y,
      responseType: h,
      headers: b,
      withCredentials: w = "same-origin",
      fetchOptions: x,
      maxContentLength: E,
      maxBodyLength: k
    } = $t(e);
    const S = he.isNumber(E) && E > -1;
    const T = he.isNumber(k) && k > -1;
    let C = i || fetch;
    h = h ? (h + "").toLowerCase() : "text";
    let A = Xt([l, c && c.toAbortSignal()], p);
    let _ = null;
    const O = A && A.unsubscribe && (() => {
      A.unsubscribe();
    });
    let M;
    try {
      if (S && typeof t === "string" && t.startsWith("data:")) {
        const r = or(t);
        if (r > E) {
          throw new Ue("maxContentLength size of " + E + " exceeded", Ue.ERR_BAD_RESPONSE, e, _);
        }
      }
      if (T && r !== "get" && r !== "head") {
        const t = await v(b, s);
        if (typeof t === "number" && isFinite(t) && t > k) {
          throw new Ue("Request body larger than maxBodyLength limit", Ue.ERR_BAD_REQUEST, e, _);
        }
      }
      if (y && d && r !== "get" && r !== "head" && (M = await v(b, s)) !== 0) {
        let e;
        let r = new o(t, {
          method: "POST",
          body: s,
          duplex: "half"
        });
        if (he.isFormData(s) && (e = r.headers.get("content-type"))) {
          b.setContentType(e);
        }
        if (r.body) {
          const [e, t] = Dt(M, jt(Lt(y)));
          s = nr(r.body, sr, e, t);
        }
      }
      if (!he.isString(w)) {
        w = w ? "include" : "omit";
      }
      const i = u && "credentials" in o.prototype;
      if (he.isFormData(s)) {
        const e = b.getContentType();
        if (e && /^multipart\/form-data/i.test(e) && !/boundary=/i.test(e)) {
          b.delete("content-type");
        }
      }
      b.set("User-Agent", "axios/" + ar, false);
      const l = {
        ...x,
        signal: A,
        method: r.toUpperCase(),
        headers: Ae(b.normalize()),
        body: s,
        duplex: "half",
        credentials: i ? w : undefined
      };
      _ = u && new o(t, l);
      let c = await (u ? C(_, x) : C(t, l));
      if (S) {
        const t = he.toFiniteNumber(c.headers.get("content-length"));
        if (t != null && t > E) {
          throw new Ue("maxContentLength size of " + E + " exceeded", Ue.ERR_BAD_RESPONSE, e, _);
        }
      }
      const p = f && (h === "stream" || h === "response");
      if (f && c.body && (m || S || p && O)) {
        const t = {};
        ["status", "statusText", "headers"].forEach(e => {
          t[e] = c[e];
        });
        const r = he.toFiniteNumber(c.headers.get("content-length"));
        const [n, i] = m && Dt(r, jt(Lt(m), true)) || [];
        let o = 0;
        const s = t => {
          if (S && (o = t, o > E)) {
            throw new Ue("maxContentLength size of " + E + " exceeded", Ue.ERR_BAD_RESPONSE, e, _);
          }
          if (n) {
            n(t);
          }
        };
        c = new a(nr(c.body, sr, s, () => {
          if (i) {
            i();
          }
          if (O) {
            O();
          }
        }), t);
      }
      h = h || "text";
      let P = await g[he.findKey(g, h) || "text"](c, e);
      if (S && !f && !p) {
        let t;
        if (P != null) {
          if (typeof P.byteLength === "number") {
            t = P.byteLength;
          } else if (typeof P.size === "number") {
            t = P.size;
          } else if (typeof P === "string") {
            t = typeof n === "function" ? new n().encode(P).byteLength : P.length;
          }
        }
        if (typeof t === "number" && t > E) {
          throw new Ue("maxContentLength size of " + E + " exceeded", Ue.ERR_BAD_RESPONSE, e, _);
        }
      }
      if (!p && O) {
        O();
      }
      return await new Promise((t, r) => {
        Mt(t, r, {
          data: P,
          headers: De.from(c.headers),
          status: c.status,
          statusText: c.statusText,
          config: e,
          request: _
        });
      });
    } catch (P) {
      if (O) {
        O();
      }
      if (A && A.aborted && A.reason instanceof Ue) {
        const t = A.reason;
        t.config = e;
        if (_) {
          t.request = _;
        }
        if (P !== t) {
          t.cause = P;
        }
        throw t;
      }
      if (P && P.name === "TypeError" && /Load failed|fetch/i.test(P.message)) {
        throw Object.assign(new Ue("Network Error", Ue.ERR_NETWORK, e, _, P && P.response), {
          cause: P.cause || P
        });
      }
      throw Ue.from(P, P && P.code, e, _, P && P.response);
    }
  };
};
const pr = new Map();
const dr = e => {
  let t = e && e.env || {};
  const {
    fetch: r,
    Request: n,
    Response: i
  } = t;
  const o = [n, i, r];
  let a;
  let s;
  let u = o.length;
  let l = u;
  let c = pr;
  while (l--) {
    a = o[l];
    s = c.get(a);
    if (s === undefined) {
      c.set(a, s = l ? new Map() : cr(t));
    }
    c = s;
  }
  return s;
};
dr();
const fr = {
  http: Be,
  xhr: Kt,
  fetch: {
    get: dr
  }
};
he.forEach(fr, (e, t) => {
  if (e) {
    try {
      Object.defineProperty(e, "name", {
        __proto__: null,
        value: t
      });
    } catch (r) {}
    Object.defineProperty(e, "adapterName", {
      __proto__: null,
      value: t
    });
  }
});
const gr = e => `- ${e}`;
const mr = e => he.isFunction(e) || e === null || e === false;
function vr(e, t) {
  e = he.isArray(e) ? e : [e];
  const {
    length: r
  } = e;
  let n;
  let i;
  const o = {};
  for (let a = 0; a < r; a++) {
    let r;
    n = e[a];
    i = n;
    if (!mr(n) && (i = fr[(r = String(n)).toLowerCase()], i === undefined)) {
      throw new Ue(`Unknown adapter '${r}'`);
    }
    if (i && (he.isFunction(i) || (i = i.get(t)))) {
      break;
    }
    o[r || "#" + a] = i;
  }
  if (!i) {
    const e = Object.entries(o).map(([e, t]) => `adapter ${e} ${t === false ? "is not supported by the environment" : "is not available in the build"}`);
    let t = r ? e.length > 1 ? "since :\n" + e.map(gr).join("\n") : " " + gr(e[0]) : "as no adapter specified";
    throw new Ue("There is no suitable adapter to dispatch the request " + t, "ERR_NOT_SUPPORT");
  }
  return i;
}
var yr = {
  getAdapter: vr,
  adapters: fr
};
function hr(e) {
  if (e.cancelToken) {
    e.cancelToken.throwIfRequested();
  }
  if (e.signal && e.signal.aborted) {
    throw new Ot(null, e);
  }
}
function br(e) {
  hr(e);
  e.headers = De.from(e.headers);
  e.data = Ct.call(e, e.transformRequest);
  if (["post", "put", "patch"].indexOf(e.method) !== -1) {
    e.headers.setContentType("application/x-www-form-urlencoded", false);
  }
  const t = yr.getAdapter(e.adapter || Tt.adapter, e);
  return t(e).then(function (t) {
    hr(e);
    e.response = t;
    try {
      t.data = Ct.call(e, e.transformResponse, t);
    } finally {
      delete e.response;
    }
    t.headers = De.from(t.headers);
    return t;
  }, function (t) {
    if (!At(t) && (hr(e), t && t.response)) {
      e.response = t.response;
      try {
        t.response.data = Ct.call(e, e.transformResponse, t.response);
      } finally {
        delete e.response;
      }
      t.response.headers = De.from(t.response.headers);
    }
    return Promise.reject(t);
  });
}
const wr = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((e, t) => {
  wr[e] = function (r) {
    return typeof r === e || "a" + (t < 1 ? "n " : " ") + e;
  };
});
const xr = {};
function Er(e, t, r) {
  if (typeof e !== "object") {
    throw new Ue("options must be an object", Ue.ERR_BAD_OPTION_VALUE);
  }
  const n = Object.keys(e);
  let i = n.length;
  while (i-- > 0) {
    const o = n[i];
    const a = Object.prototype.hasOwnProperty.call(t, o) ? t[o] : undefined;
    if (a) {
      const t = e[o];
      const r = t === undefined || a(t, o, e);
      if (r !== true) {
        throw new Ue("option " + o + " must be " + r, Ue.ERR_BAD_OPTION_VALUE);
      }
    } else if (r !== true) {
      throw new Ue("Unknown option " + o, Ue.ERR_BAD_OPTION);
    }
  }
}
wr.transitional = function (e, t, r) {
  function n(e, t) {
    return "[Axios v" + ar + "] Transitional option '" + e + "'" + t + (r ? ". " + r : "");
  }
  return (r, i, o) => {
    if (e === false) {
      throw new Ue(n(i, " has been removed" + (t ? " in " + t : "")), Ue.ERR_DEPRECATED);
    }
    if (t && !xr[i]) {
      xr[i] = true;
      console.warn(n(i, " has been deprecated since v" + t + " and will be removed in the near future"));
    }
    return !e || e(r, i, o);
  };
};
wr.spelling = function (e) {
  return (t, r) => {
    console.warn(`${r} is likely a misspelling of ${e}`);
    return true;
  };
};
var kr = {
  assertOptions: Er,
  validators: wr
};
const Sr = kr.validators;
class Tr {
  constructor(e) {
    this.defaults = e || {};
    this.interceptors = {
      request: new ot(),
      response: new ot()
    };
  }
  async request(e, t) {
    try {
      return await this._request(e, t);
    } catch (r) {
      if (r instanceof Error) {
        let e = {};
        if (Error.captureStackTrace) {
          Error.captureStackTrace(e);
        } else {
          e = new Error();
        }
        const t = (() => {
          if (!e.stack) {
            return "";
          }
          const t = e.stack.indexOf("\n");
          if (t === -1) {
            return "";
          } else {
            return e.stack.slice(t + 1);
          }
        })();
        try {
          if (r.stack) {
            if (t) {
              const e = t.indexOf("\n");
              const n = e === -1 ? -1 : t.indexOf("\n", e + 1);
              const i = n === -1 ? "" : t.slice(n + 1);
              if (!String(r.stack).endsWith(i)) {
                r.stack += "\n" + t;
              }
            }
          } else {
            r.stack = t;
          }
        } catch (n) {}
      }
      throw r;
    }
  }
  _request(e, t) {
    if (typeof e === "string") {
      t = t || {};
      t.url = e;
    } else {
      t = e || {};
    }
    t = Ht(this.defaults, t);
    const {
      transitional: r,
      paramsSerializer: n,
      headers: i
    } = t;
    if (r !== undefined) {
      kr.assertOptions(r, {
        silentJSONParsing: Sr.transitional(Sr.boolean),
        forcedJSONParsing: Sr.transitional(Sr.boolean),
        clarifyTimeoutError: Sr.transitional(Sr.boolean),
        legacyInterceptorReqResOrdering: Sr.transitional(Sr.boolean)
      }, false);
    }
    if (n != null) {
      if (he.isFunction(n)) {
        t.paramsSerializer = {
          serialize: n
        };
      } else {
        kr.assertOptions(n, {
          encode: Sr.function,
          serialize: Sr.function
        }, true);
      }
    }
    if (t.allowAbsoluteUrls === undefined) {
      if (this.defaults.allowAbsoluteUrls !== undefined) {
        t.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
      } else {
        t.allowAbsoluteUrls = true;
      }
    }
    kr.assertOptions(t, {
      baseUrl: Sr.spelling("baseURL"),
      withXsrfToken: Sr.spelling("withXSRFToken")
    }, true);
    t.method = (t.method || this.defaults.method || "get").toLowerCase();
    let o = i && he.merge(i.common, i[t.method]);
    if (i) {
      he.forEach(["delete", "get", "head", "post", "put", "patch", "query", "common"], e => {
        delete i[e];
      });
    }
    t.headers = De.concat(o, i);
    const a = [];
    let s = true;
    this.interceptors.request.forEach(function (e) {
      if (typeof e.runWhen === "function" && e.runWhen(t) === false) {
        return;
      }
      s = s && e.synchronous;
      const r = t.transitional || at;
      const n = r && r.legacyInterceptorReqResOrdering;
      if (n) {
        a.unshift(e.fulfilled, e.rejected);
      } else {
        a.push(e.fulfilled, e.rejected);
      }
    });
    const u = [];
    let l;
    this.interceptors.response.forEach(function (e) {
      u.push(e.fulfilled, e.rejected);
    });
    let c;
    let p = 0;
    if (!s) {
      const e = [br.bind(this), undefined];
      e.unshift(...a);
      e.push(...u);
      c = e.length;
      l = Promise.resolve(t);
      while (p < c) {
        l = l.then(e[p++], e[p++]);
      }
      return l;
    }
    c = a.length;
    let d = t;
    while (p < c) {
      const e = a[p++];
      const t = a[p++];
      try {
        d = e(d);
      } catch (f) {
        t.call(this, f);
        break;
      }
    }
    try {
      l = br.call(this, d);
    } catch (f) {
      return Promise.reject(f);
    }
    p = 0;
    c = u.length;
    while (p < c) {
      l = l.then(u[p++], u[p++]);
    }
    return l;
  }
  getUri(e) {
    e = Ht(this.defaults, e);
    const t = Bt(e.baseURL, e.url, e.allowAbsoluteUrls);
    return nt(t, e.params, e.paramsSerializer);
  }
}
he.forEach(["delete", "get", "head", "options"], function (e) {
  Tr.prototype[e] = function (t, r) {
    return this.request(Ht(r || {}, {
      method: e,
      url: t,
      data: (r || {}).data
    }));
  };
});
he.forEach(["post", "put", "patch", "query"], function (e) {
  function t(t) {
    return function (r, n, i) {
      return this.request(Ht(i || {}, {
        method: e,
        headers: t ? {
          "Content-Type": "multipart/form-data"
        } : {},
        url: r,
        data: n
      }));
    };
  }
  Tr.prototype[e] = t();
  if (e !== "query") {
    Tr.prototype[e + "Form"] = t(true);
  }
});
var Cr = Tr;
class Ar {
  constructor(e) {
    if (typeof e !== "function") {
      throw new TypeError("executor must be a function.");
    }
    let t;
    this.promise = new Promise(function (e) {
      t = e;
    });
    const r = this;
    this.promise.then(e => {
      if (!r._listeners) {
        return;
      }
      let t = r._listeners.length;
      while (t-- > 0) {
        r._listeners[t](e);
      }
      r._listeners = null;
    });
    this.promise.then = e => {
      let t;
      const n = new Promise(e => {
        r.subscribe(e);
        t = e;
      }).then(e);
      n.cancel = function () {
        r.unsubscribe(t);
      };
      return n;
    };
    e(function (e, n, i) {
      if (!r.reason) {
        r.reason = new Ot(e, n, i);
        t(r.reason);
      }
    });
  }
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }
  subscribe(e) {
    if (this.reason) {
      e(this.reason);
    } else if (this._listeners) {
      this._listeners.push(e);
    } else {
      this._listeners = [e];
    }
  }
  unsubscribe(e) {
    if (!this._listeners) {
      return;
    }
    const t = this._listeners.indexOf(e);
    if (t !== -1) {
      this._listeners.splice(t, 1);
    }
  }
  toAbortSignal() {
    const e = new AbortController();
    const t = t => {
      e.abort(t);
    };
    this.subscribe(t);
    e.signal.unsubscribe = () => this.unsubscribe(t);
    return e.signal;
  }
  static source() {
    let e;
    const t = new Ar(function (t) {
      e = t;
    });
    return {
      token: t,
      cancel: e
    };
  }
}
var _r = Ar;
function Or(e) {
  return function (t) {
    return e.apply(null, t);
  };
}
function Mr(e) {
  return he.isObject(e) && e.isAxiosError === true;
}
const Pr = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526
};
Object.entries(Pr).forEach(([e, t]) => {
  Pr[t] = e;
});
var qr = Pr;
function Nr(e) {
  const t = new Cr(e);
  const r = i(Cr.prototype.request, t);
  he.extend(r, Cr.prototype, t, {
    allOwnKeys: true
  });
  he.extend(r, t, null, {
    allOwnKeys: true
  });
  r.create = function (t) {
    return Nr(Ht(e, t));
  };
  return r;
}
const Rr = Nr(Tt);
Rr.Axios = Cr;
Rr.CanceledError = Ot;
Rr.CancelToken = _r;
Rr.isCancel = At;
Rr.VERSION = ar;
Rr.toFormData = Ke;
Rr.AxiosError = Ue;
Rr.Cancel = Rr.CanceledError;
Rr.all = function (e) {
  return Promise.all(e);
};
Rr.spread = Or;
Rr.isAxiosError = Mr;
Rr.mergeConfig = Ht;
Rr.AxiosHeaders = De;
Rr.formToJSON = e => xt(he.isHTMLForm(e) ? new FormData(e) : e);
Rr.getAdapter = yr.getAdapter;
Rr.HttpStatusCode = qr;
Rr.default = Rr;
var Ir = Rr;
};
