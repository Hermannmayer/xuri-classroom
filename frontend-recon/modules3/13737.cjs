// webpack module 13737 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./65162.js");
function i(e, t, r, i, o) {
  var a = n(e, t, r, i, o);
  return a.next().then(function (e) {
    if (e.done) {
      return e.value;
    } else {
      return a.next();
    }
  });
}
module.exports = i;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
