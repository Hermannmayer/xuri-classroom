// webpack module 84207 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return u;
  }
});
var n = require("./59496.js");
function i(e) {
  var t = [];
  for (var r = 1; r < arguments.length; r++) {
    t[r - 1] = arguments[r];
  }
  if (e && e.addEventListener) {
    e.addEventListener.apply(e, t);
  }
}
function o(e) {
  var t = [];
  for (var r = 1; r < arguments.length; r++) {
    t[r - 1] = arguments[r];
  }
  if (e && e.removeEventListener) {
    e.removeEventListener.apply(e, t);
  }
}
var a = ["mousedown", "touchstart"];
function s(e, t, r = a) {
  var s = (0, n.useRef)(t);
  (0, n.useEffect)(function () {
    s.current = t;
  }, [t]);
  (0, n.useEffect)(function () {
    var t = function (t) {
      var r = e.current;
      if (r && !r.contains(t.target)) {
        s.current(t);
      }
    };
    for (var n = 0, a = r; n < a.length; n++) {
      var u = a[n];
      i(document, u, t);
    }
    return function () {
      for (var e = 0, n = r; e < n.length; e++) {
        var i = n[e];
        o(document, i, t);
      }
    };
  }, [r, e]);
}
var u = s;
};
