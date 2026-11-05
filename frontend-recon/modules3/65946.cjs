// webpack module 65946 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return o;
  }
});
var n = true;
var i = "Invariant failed";
function o(e, t) {
  if (!e) {
    if (n) {
      throw new Error(i);
    }
    var r = typeof t === "function" ? t() : t;
    var o = r ? `${i}: ${r}` : i;
    throw new Error(o);
  }
}
};
