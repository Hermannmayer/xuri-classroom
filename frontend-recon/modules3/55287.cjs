// webpack module 55287 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./18753.js");
function i(e, t) {
  if (e == null) {
    return {};
  }
  var r;
  var i;
  var o = n(e, t);
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (i = 0; i < a.length; i++) {
      r = a[i];
      if (t.indexOf(r) === -1 && {}.propertyIsEnumerable.call(e, r)) {
        o[r] = e[r];
      }
    }
  }
  return o;
}
module.exports = i;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
