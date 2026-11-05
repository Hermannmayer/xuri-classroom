// webpack module 14389 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./73727.js");
function i(e, t, r) {
  if ((t = n(t)) in e) {
    Object.defineProperty(e, t, {
      value: r,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    e[t] = r;
  }
  return e;
}
module.exports = i;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
