// webpack module 88174 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  o: function () {
    return s;
  }
});
var n = require("./59496.js");
var i = require("./67361.js");
var o = (0, i.Z)() ? n.useLayoutEffect : n.useEffect;
function a(e, t) {
  var r = n.useRef(true);
  o(function () {
    return e(r.current);
  }, t);
  o(function () {
    r.current = false;
    return function () {
      r.current = true;
    };
  }, []);
}
function s(e, t) {
  a(function (t) {
    if (!t) {
      return e();
    }
  }, t);
}
exports.Z = a;
};
