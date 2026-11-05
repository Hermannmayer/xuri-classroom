// webpack module 51641 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./28004.js").default;
function i(e, t) {
  if (n(e) != "object" || !e) {
    return e;
  }
  var r = e[Symbol.toPrimitive];
  if (r !== undefined) {
    var i = r.call(e, t || "default");
    if (n(i) != "object") {
      return i;
    }
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
module.exports = i;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
