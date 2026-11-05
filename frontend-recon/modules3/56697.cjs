// webpack module 56697 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return i;
  }
});
var n = require("./59496.js");
function i(e) {
  var t = n.useRef();
  t.current = e;
  var r = n.useCallback(function () {
    var e;
    for (var r = arguments.length, n = new Array(r), i = 0; i < r; i++) {
      n[i] = arguments[i];
    }
    if ((e = t.current) === null || e === undefined) {
      return undefined;
    } else {
      return e.call.apply(e, [t].concat(n));
    }
  }, []);
  return r;
}
};
