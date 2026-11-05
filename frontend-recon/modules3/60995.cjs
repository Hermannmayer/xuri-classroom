// webpack module 60995 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return i;
  }
});
var n = require("./57987.js");
function i(e, t) {
  if (e) {
    if (typeof e == "string") {
      return (0, n.Z)(e, t);
    }
    var r = {}.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor) {
      r = e.constructor.name;
    }
    if (r === "Map" || r === "Set") {
      return Array.from(e);
    } else if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)) {
      return (0, n.Z)(e, t);
    } else {
      return undefined;
    }
  }
}
};
