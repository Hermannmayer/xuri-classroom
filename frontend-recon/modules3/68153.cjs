// webpack module 68153 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./19706.js").some;
var o = n.aTypedArray;
var a = n.exportTypedArrayMethod;
a("some", function (e) {
  return i(o(this), e, arguments.length > 1 ? arguments[1] : undefined);
});
};
