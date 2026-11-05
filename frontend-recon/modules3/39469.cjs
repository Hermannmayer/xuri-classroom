// webpack module 39469 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return o;
  }
});
var n = require("./75728.js");
function i(e, t) {
  if ((0, n.Z)(e) != "object" || !e) {
    return e;
  }
  var r = e[Symbol.toPrimitive];
  if (r !== undefined) {
    var i = r.call(e, t || "default");
    if ((0, n.Z)(i) != "object") {
      return i;
    }
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function o(e) {
  var t = i(e, "string");
  if ((0, n.Z)(t) == "symbol") {
    return t;
  } else {
    return t + "";
  }
}
};
