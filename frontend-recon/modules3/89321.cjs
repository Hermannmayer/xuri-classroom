// webpack module 89321 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./67570.js").includes;
var o = n.aTypedArray;
var a = n.exportTypedArrayMethod;
a("includes", function (e) {
  return i(o(this), e, arguments.length > 1 ? arguments[1] : undefined);
});
};
