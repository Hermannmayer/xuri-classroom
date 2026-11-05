// webpack module 40960 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./8877.js").left;
var o = n.aTypedArray;
var a = n.exportTypedArrayMethod;
a("reduce", function (e) {
  return i(o(this), e, arguments.length, arguments.length > 1 ? arguments[1] : undefined);
});
};
