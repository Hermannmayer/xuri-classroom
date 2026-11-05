// webpack module 12683 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return o;
  }
});
var n = require("./75728.js");
var i = require("./39695.js");
function o(e, t) {
  if (t && ((0, n.Z)(t) == "object" || typeof t == "function")) {
    return t;
  }
  if (t !== undefined) {
    throw new TypeError("Derived constructors may only return object or undefined");
  }
  return (0, i.Z)(e);
}
};
