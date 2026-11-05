// webpack module 71258 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return o;
  }
});
var n = require("./69926.js");
var i = require("./231.js");
function o(e, t, r) {
  if ((0, n.Z)()) {
    return Reflect.construct.apply(null, arguments);
  }
  var o = [null];
  o.push.apply(o, t);
  var a = new (e.bind.apply(e, o))();
  if (r) {
    (0, i.Z)(a, r.prototype);
  }
  return a;
}
};
