// webpack module 75728 — body from webcrack
module.exports = function (module, exports, require) {
function n(e) {
  n = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function (e) {
    return typeof e;
  } : function (e) {
    if (e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype) {
      return "symbol";
    } else {
      return typeof e;
    }
  };
  return n(e);
}
require.d(exports, {
  Z: function () {
    return n;
  }
});
};
