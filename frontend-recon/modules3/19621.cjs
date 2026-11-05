// webpack module 19621 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./32191.js");
var o = n.aTypedArray;
var a = n.exportTypedArrayMethod;
a("copyWithin", function (e, t) {
  return i.call(o(this), e, t, arguments.length > 2 ? arguments[2] : undefined);
});
};
