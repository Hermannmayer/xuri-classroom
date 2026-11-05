// webpack module 78212 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return i;
  }
});
var n = require("./231.js");
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
    (0, n.Z)(e, t);
  }
}
};
