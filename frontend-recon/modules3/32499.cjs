// webpack module 32499 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = function () {
  if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
    return false;
  }
  if (typeof Symbol.iterator === "symbol") {
    return true;
  }
  var e = {};
  var t = Symbol("test");
  var r = Object(t);
  if (typeof t === "string") {
    return false;
  }
  if (Object.prototype.toString.call(t) !== "[object Symbol]") {
    return false;
  }
  if (Object.prototype.toString.call(r) !== "[object Symbol]") {
    return false;
  }
  var n = 42;
  e[t] = n;
  for (var i in e) {
    return false;
  }
  if (typeof Object.keys === "function" && Object.keys(e).length !== 0) {
    return false;
  }
  if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(e).length !== 0) {
    return false;
  }
  var o = Object.getOwnPropertySymbols(e);
  if (o.length !== 1 || o[0] !== t) {
    return false;
  }
  if (!Object.prototype.propertyIsEnumerable.call(e, t)) {
    return false;
  }
  if (typeof Object.getOwnPropertyDescriptor === "function") {
    var a = Object.getOwnPropertyDescriptor(e, t);
    if (a.value !== n || a.enumerable !== true) {
      return false;
    }
  }
  return true;
};
};
