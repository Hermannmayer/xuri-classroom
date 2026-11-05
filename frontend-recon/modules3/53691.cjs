// webpack module 53691 — body from webcrack
module.exports = function (module, exports, require) {
function n(e) {
  n = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (e) {
    return e.__proto__ || Object.getPrototypeOf(e);
  };
  return n(e);
}
require.d(exports, {
  Z: function () {
    return n;
  }
});
};
