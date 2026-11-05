// webpack module 45810 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return o;
  }
});
var n = require("./39469.js");
function i(e, t) {
  for (var r = 0; r < t.length; r++) {
    var i = t[r];
    i.enumerable = i.enumerable || false;
    i.configurable = true;
    if ("value" in i) {
      i.writable = true;
    }
    Object.defineProperty(e, (0, n.Z)(i.key), i);
  }
}
function o(e, t, r) {
  if (t) {
    i(e.prototype, t);
  }
  if (r) {
    i(e, r);
  }
  Object.defineProperty(e, "prototype", {
    writable: false
  });
  return e;
}
};
