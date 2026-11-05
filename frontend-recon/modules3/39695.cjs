// webpack module 39695 — body from webcrack
module.exports = function (module, exports, require) {
function n(e) {
  if (e === undefined) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return e;
}
require.d(exports, {
  Z: function () {
    return n;
  }
});
};
