// webpack module 67361 — body from webcrack
module.exports = function (module, exports, require) {
function n() {
  return typeof window !== "undefined" && !!window.document && !!window.document.createElement;
}
require.d(exports, {
  Z: function () {
    return n;
  }
});
};
