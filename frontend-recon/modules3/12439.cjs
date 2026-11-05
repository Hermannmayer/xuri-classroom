// webpack module 12439 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./19706.js").forEach;
var o = n.aTypedArray;
var a = n.exportTypedArrayMethod;
a("forEach", function (e) {
  i(o(this), e, arguments.length > 1 ? arguments[1] : undefined);
});
};
