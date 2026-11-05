// webpack module 44653 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = o;
var i = n(require("./38524.js"));
function o(e, t) {
  var r = (0, i.default)({}, e);
  if (Array.isArray(t)) {
    t.forEach(function (e) {
      delete r[e];
    });
  }
  return r;
}
};
