// webpack module 61895 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = n.aTypedArray;
var o = n.exportTypedArrayMethod;
var a = [].sort;
o("sort", function (e) {
  return a.call(i(this), e);
});
};
