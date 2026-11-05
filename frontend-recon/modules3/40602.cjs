// webpack module 40602 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./28004.js").default;
function i(t, r) {
  if (typeof WeakMap == "function") {
    var o = new WeakMap();
    var a = new WeakMap();
  }
  return (module.exports = i = function (e, t) {
    if (!t && e && e.__esModule) {
      return e;
    }
    var r;
    var i;
    var s = {
      __proto__: null,
      default: e
    };
    if (e === null || n(e) != "object" && typeof e != "function") {
      return s;
    }
    if (r = t ? a : o) {
      if (r.has(e)) {
        return r.get(e);
      }
      r.set(e, s);
    }
    for (var u in e) {
      if (u !== "default" && {}.hasOwnProperty.call(e, u)) {
        if ((i = (r = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, u)) && (i.get || i.set)) {
          r(s, u, i);
        } else {
          s[u] = e[u];
        }
      }
    }
    return s;
  }, module.exports.__esModule = true, module.exports.default = module.exports)(t, r);
}
module.exports = i;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
