// webpack module 69926 — body from webcrack
module.exports = function (module, exports, require) {
function n() {
  try {
    var e = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
  } catch (e) {}
  return (n = function () {
    return !!e;
  })();
}
require.d(exports, {
  Z: function () {
    return n;
  }
});
};
