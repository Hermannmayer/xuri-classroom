// webpack module 64515 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return o;
  }
});
var n = require("./23874.js");
var i = require("./59496.js");
function o(e) {
  var t = i.useRef(false);
  var r = i.useState(e);
  var o = (0, n.Z)(r, 2);
  var a = o[0];
  var s = o[1];
  function u(e, r) {
    if (!r || !t.current) {
      s(e);
    }
  }
  i.useEffect(function () {
    t.current = false;
    return function () {
      t.current = true;
    };
  }, []);
  return [a, u];
}
};
