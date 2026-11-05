// webpack module 78125 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return i;
  }
});
var n = require("./87995.js");
function i(e, t, r, i) {
  var o = n.unstable_batchedUpdates ? function (e) {
    n.unstable_batchedUpdates(r, e);
  } : r;
  if (e !== null && e !== undefined && e.addEventListener) {
    e.addEventListener(t, o, i);
  }
  return {
    remove: function () {
      if (e !== null && e !== undefined && e.removeEventListener) {
        e.removeEventListener(t, o, i);
      }
    }
  };
}
};
