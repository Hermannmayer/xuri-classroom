// webpack module 38524 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./14389.js");
function i(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    if (t) {
      n = n.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      });
    }
    r.push.apply(r, n);
  }
  return r;
}
function o(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] ?? {};
    if (t % 2) {
      i(Object(r), true).forEach(function (t) {
        n(e, t, r[t]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(e, Object.getOwnPropertyDescriptors(r));
    } else {
      i(Object(r)).forEach(function (t) {
        Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(r, t));
      });
    }
  }
  return e;
}
module.exports = o;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
