// webpack module 23639 — body from webcrack
module.exports = function (module, exports, require) {
function n(e, t, r, n, i, o, a) {
  try {
    var s = e[o](a);
    var u = s.value;
  } catch (e) {
    r(e);
    return;
  }
  if (s.done) {
    t(u);
  } else {
    Promise.resolve(u).then(n, i);
  }
}
function i(e) {
  return function () {
    var t = this;
    var r = arguments;
    return new Promise(function (i, o) {
      var a = e.apply(t, r);
      function s(e) {
        n(a, i, o, s, u, "next", e);
      }
      function u(e) {
        n(a, i, o, s, u, "throw", e);
      }
      s(undefined);
    });
  };
}
require.d(exports, {
  Z: function () {
    return i;
  }
});
};
