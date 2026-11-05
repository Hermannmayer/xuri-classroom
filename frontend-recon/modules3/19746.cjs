// webpack module 19746 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return a;
  }
});
var n = require("./53691.js");
var i = require("./69926.js");
var o = require("./12683.js");
function a(e) {
  var t = (0, i.Z)();
  return function () {
    var r;
    var i = (0, n.Z)(e);
    if (t) {
      var a = (0, n.Z)(this).constructor;
      r = Reflect.construct(i, arguments, a);
    } else {
      r = i.apply(this, arguments);
    }
    return (0, o.Z)(this, r);
  };
}
};
