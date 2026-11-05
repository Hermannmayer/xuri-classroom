// webpack module 62298 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./3499.js");
function i(e, t) {
  if (typeof t != "function" && t !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }
  e.prototype = Object.create(t && t.prototype, {
    constructor: {
      value: e,
      writable: true,
      configurable: true
    }
  });
  Object.defineProperty(e, "prototype", {
    writable: false
  });
  if (t) {
    n(e, t);
  }
}
module.exports = i;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
