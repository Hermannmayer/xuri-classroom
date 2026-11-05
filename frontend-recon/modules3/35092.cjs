// webpack module 35092 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./76745.js");
var i = require("./15634.js");
var o = require("./46635.js");
function a(e) {
  var t = i();
  return function () {
    var r;
    var i = n(e);
    if (t) {
      var a = n(this).constructor;
      r = Reflect.construct(i, arguments, a);
    } else {
      r = i.apply(this, arguments);
    }
    return o(this, r);
  };
}
module.exports = a;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
