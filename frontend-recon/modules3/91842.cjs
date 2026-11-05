// webpack module 91842 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return i;
  }
});
var n = require("./91613.js");
function i(e, t) {
  var r = (0, n.Z)({}, e);
  if (Array.isArray(t)) {
    t.forEach(function (e) {
      delete r[e];
    });
  }
  return r;
}
};
