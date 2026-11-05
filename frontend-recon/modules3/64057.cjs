// webpack module 64057 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return i;
  }
});
var n = require("./59496.js");
function i(e, t, r) {
  var i = n.useRef({});
  if (!("value" in i.current) || !!r(i.current.condition, t)) {
    i.current.value = e();
    i.current.condition = t;
  }
  return i.current.value;
}
};
