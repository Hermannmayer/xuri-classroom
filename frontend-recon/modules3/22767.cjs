// webpack module 22767 — body from webcrack
module.exports = function (module, exports, require) {
var t = Object.getOwnPropertySymbols;
var r = Object.prototype.hasOwnProperty;
var n = Object.prototype.propertyIsEnumerable;
function i(e) {
  if (e === null || e === undefined) {
    throw new TypeError("Object.assign cannot be called with null or undefined");
  }
  return Object(e);
}
function o() {
  try {
    if (!Object.assign) {
      return false;
    }
    var e = new String("abc");
    e[5] = "de";
    if (Object.getOwnPropertyNames(e)[0] === "5") {
      return false;
    }
    var t = {};
    for (var r = 0; r < 10; r++) {
      t["_" + String.fromCharCode(r)] = r;
    }
    var n = Object.getOwnPropertyNames(t).map(function (e) {
      return t[e];
    });
    if (n.join("") !== "0123456789") {
      return false;
    }
    var i = {};
    "abcdefghijklmnopqrst".split("").forEach(function (e) {
      i[e] = e;
    });
    return Object.keys(Object.assign({}, i)).join("") === "abcdefghijklmnopqrst";
  } catch (o) {
    return false;
  }
}
module.exports = o() ? Object.assign : function (e, o) {
  var a;
  var s;
  var u = i(e);
  for (var l = 1; l < arguments.length; l++) {
    a = Object(arguments[l]);
    for (var c in a) {
      if (r.call(a, c)) {
        u[c] = a[c];
      }
    }
    if (t) {
      s = t(a);
      for (var p = 0; p < s.length; p++) {
        if (n.call(a, s[p])) {
          u[s[p]] = a[s[p]];
        }
      }
    }
  }
  return u;
};
};
