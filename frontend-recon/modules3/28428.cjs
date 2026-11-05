// webpack module 28428 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return i;
  }
});
var n = require("./231.js");
function i(e, t) {
  e.prototype = Object.create(t.prototype);
  e.prototype.constructor = e;
  (0, n.Z)(e, t);
}
};
