// webpack module 1747 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./44512.js");
function i(e, t) {
  if (e) {
    if (typeof e == "string") {
      return n(e, t);
    }
    var r = {}.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor) {
      r = e.constructor.name;
    }
    if (r === "Map" || r === "Set") {
      return Array.from(e);
    } else if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)) {
      return n(e, t);
    } else {
      return undefined;
    }
  }
}
module.exports = i;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
