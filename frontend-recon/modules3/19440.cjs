// webpack module 19440 — body from webcrack
module.exports = function (module, exports, require) {
var n;
var i = require("./18948.js");
var o = require("./14355.js");
try {
  n = [].__proto__ === Array.prototype;
} catch (l) {
  if (!l || typeof l !== "object" || !("code" in l) || l.code !== "ERR_PROTO_ACCESS") {
    throw l;
  }
}
var a = !!n && o && o(Object.prototype, "__proto__");
var s = Object;
var u = s.getPrototypeOf;
module.exports = a && typeof a.get === "function" ? i([a.get]) : typeof u === "function" && function (e) {
  return u(e == null ? e : s(e));
};
};
