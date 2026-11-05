// webpack module 37913 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return i;
  }
});
var n = require("./96128.js");
function i(e, t) {
  if (e == null) {
    return {};
  }
  var r;
  var i;
  var o = (0, n.Z)(e, t);
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (i = 0; i < a.length; i++) {
      r = a[i];
      if (t.indexOf(r) === -1 && {}.propertyIsEnumerable.call(e, r)) {
        o[r] = e[r];
      }
    }
  }
  return o;
}
};
