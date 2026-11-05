// webpack module 60827 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./93967.js");
var o = n.aTypedArray;
var a = n.exportTypedArrayMethod;
a("lastIndexOf", function (e) {
  return i.apply(o(this), arguments);
});
};
