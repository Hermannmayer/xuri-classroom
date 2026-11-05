// webpack module 46635 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./28004.js").default;
var i = require("./87050.js");
function o(e, t) {
  if (t && (n(t) == "object" || typeof t == "function")) {
    return t;
  }
  if (t !== undefined) {
    throw new TypeError("Derived constructors may only return object or undefined");
  }
  return i(e);
}
module.exports = o;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
