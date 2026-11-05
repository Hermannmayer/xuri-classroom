// webpack module 73727 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./28004.js").default;
var i = require("./51641.js");
function o(e) {
  var t = i(e, "string");
  if (n(t) == "symbol") {
    return t;
  } else {
    return t + "";
  }
}
module.exports = o;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
