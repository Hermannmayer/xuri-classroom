// webpack module 83700 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  g1: function () {
    return n;
  },
  os: function () {
    return i;
  }
});
function n() {
  var e = document.documentElement.clientWidth;
  var t = window.innerHeight || document.documentElement.clientHeight;
  return {
    width: e,
    height: t
  };
}
function i(e) {
  var t = e.getBoundingClientRect();
  var r = document.documentElement;
  return {
    left: t.left + (window.pageXOffset || r.scrollLeft) - (r.clientLeft || document.body.clientLeft || 0),
    top: t.top + (window.pageYOffset || r.scrollTop) - (r.clientTop || document.body.clientTop || 0)
  };
}
};
