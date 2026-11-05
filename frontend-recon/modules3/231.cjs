// webpack module 231 — body from webcrack
module.exports = function (module, exports, require) {
function n(e, t) {
  n = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (e, t) {
    e.__proto__ = t;
    return e;
  };
  return n(e, t);
}
require.d(exports, {
  Z: function () {
    return n;
  }
});
};
