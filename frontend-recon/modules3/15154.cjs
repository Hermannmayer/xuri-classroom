// webpack module 15154 — body from webcrack
module.exports = function (module, exports, require) {
var t = typeof Element !== "undefined";
var r = typeof Map === "function";
var n = typeof Set === "function";
var i = typeof ArrayBuffer === "function" && !!ArrayBuffer.isView;
function o(e, a) {
  if (e === a) {
    return true;
  }
  if (e && a && typeof e == "object" && typeof a == "object") {
    if (e.constructor !== a.constructor) {
      return false;
    }
    var s;
    var u;
    var l;
    var c;
    if (Array.isArray(e)) {
      s = e.length;
      if (s != a.length) {
        return false;
      }
      for (u = s; u-- !== 0;) {
        if (!o(e[u], a[u])) {
          return false;
        }
      }
      return true;
    }
    if (r && e instanceof Map && a instanceof Map) {
      if (e.size !== a.size) {
        return false;
      }
      c = e.entries();
      while (!(u = c.next()).done) {
        if (!a.has(u.value[0])) {
          return false;
        }
      }
      c = e.entries();
      while (!(u = c.next()).done) {
        if (!o(u.value[1], a.get(u.value[0]))) {
          return false;
        }
      }
      return true;
    }
    if (n && e instanceof Set && a instanceof Set) {
      if (e.size !== a.size) {
        return false;
      }
      c = e.entries();
      while (!(u = c.next()).done) {
        if (!a.has(u.value[0])) {
          return false;
        }
      }
      return true;
    }
    if (i && ArrayBuffer.isView(e) && ArrayBuffer.isView(a)) {
      s = e.length;
      if (s != a.length) {
        return false;
      }
      for (u = s; u-- !== 0;) {
        if (e[u] !== a[u]) {
          return false;
        }
      }
      return true;
    }
    if (e.constructor === RegExp) {
      return e.source === a.source && e.flags === a.flags;
    }
    if (e.valueOf !== Object.prototype.valueOf && typeof e.valueOf === "function" && typeof a.valueOf === "function") {
      return e.valueOf() === a.valueOf();
    }
    if (e.toString !== Object.prototype.toString && typeof e.toString === "function" && typeof a.toString === "function") {
      return e.toString() === a.toString();
    }
    l = Object.keys(e);
    s = l.length;
    if (s !== Object.keys(a).length) {
      return false;
    }
    for (u = s; u-- !== 0;) {
      if (!Object.prototype.hasOwnProperty.call(a, l[u])) {
        return false;
      }
    }
    if (t && e instanceof Element) {
      return false;
    }
    for (u = s; u-- !== 0;) {
      if ((l[u] !== "_owner" && l[u] !== "__v" && l[u] !== "__o" || !e.$$typeof) && !o(e[l[u]], a[l[u]])) {
        return false;
      }
    }
    return true;
  }
  return e !== e && a !== a;
}
module.exports = function (e, t) {
  try {
    return o(e, t);
  } catch (r) {
    if ((r.message || "").match(/stack|recursion/i)) {
      console.warn("react-fast-compare cannot handle circular refs");
      return false;
    }
    throw r;
  }
};
};
