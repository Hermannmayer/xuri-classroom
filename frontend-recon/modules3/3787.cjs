// webpack module 3787 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return o;
  }
});
var n = require("./59496.js");
var i = require("./61357.js");
function o(e, t = {}) {
  var r = [];
  n.Children.forEach(e, function (e) {
    if (e !== undefined && e !== null || t.keepEmpty) {
      if (Array.isArray(e)) {
        r = r.concat(o(e));
      } else if ((0, i.isFragment)(e) && e.props) {
        r = r.concat(o(e.props.children, t));
      } else {
        r.push(e);
      }
    }
  });
  return r;
}
};
