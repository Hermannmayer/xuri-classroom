// webpack module 22771 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = a;
var i = n(require("./59496.js"));
var o = require("./61357.js");
function a(e, t = {}) {
  var r = [];
  i.default.Children.forEach(e, function (e) {
    if (e !== undefined && e !== null || t.keepEmpty) {
      if (Array.isArray(e)) {
        r = r.concat(a(e));
      } else if ((0, o.isFragment)(e) && e.props) {
        r = r.concat(a(e.props.children, t));
      } else {
        r.push(e);
      }
    }
  });
  return r;
}
};
