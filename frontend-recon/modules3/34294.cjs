// webpack module 34294 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./8877.js").right;
var o = n.aTypedArray;
var a = n.exportTypedArrayMethod;
a("reduceRight", function (e) {
  return i(o(this), e, arguments.length, arguments.length > 1 ? arguments[1] : undefined);
});
};
