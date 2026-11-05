// webpack module 60059 — body from webcrack
module.exports = function (module, exports, require) {
var t = "Function.prototype.bind called on incompatible ";
var r = Object.prototype.toString;
var n = Math.max;
var i = "[object Function]";
function o(e, t) {
  var r = [];
  for (var n = 0; n < e.length; n += 1) {
    r[n] = e[n];
  }
  for (var i = 0; i < t.length; i += 1) {
    r[i + e.length] = t[i];
  }
  return r;
}
function a(e, t) {
  var r = [];
  for (var n = t || 0, i = 0; n < e.length; n += 1, i += 1) {
    r[i] = e[n];
  }
  return r;
}
function s(e, t) {
  var r = "";
  for (var n = 0; n < e.length; n += 1) {
    r += e[n];
    if (n + 1 < e.length) {
      r += t;
    }
  }
  return r;
}
module.exports = function (e) {
  var u = this;
  if (typeof u !== "function" || r.apply(u) !== i) {
    throw new TypeError(t + u);
  }
  var l;
  var c = a(arguments, 1);
  var p = function () {
    if (this instanceof l) {
      var t = u.apply(this, o(c, arguments));
      if (Object(t) === t) {
        return t;
      } else {
        return this;
      }
    }
    return u.apply(e, o(c, arguments));
  };
  for (var d = n(0, u.length - c.length), f = [], g = 0; g < d; g++) {
    f[g] = "$" + g;
  }
  l = Function("binder", "return function (" + s(f, ",") + "){ return binder.apply(this,arguments); }")(p);
  if (u.prototype) {
    function m() {}
    m.prototype = u.prototype;
    l.prototype = new m();
    m.prototype = null;
  }
  return l;
};
};
