// webpack module 34256 — body from webcrack
module.exports = function (module, exports, require) {
function n() {
  n = Object.assign ? Object.assign.bind() : function (e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r) {
        if ({}.hasOwnProperty.call(r, n)) {
          e[n] = r[n];
        }
      }
    }
    return e;
  };
  return n.apply(null, arguments);
}
require.d(exports, {
  Z: function () {
    return n;
  }
});
};
