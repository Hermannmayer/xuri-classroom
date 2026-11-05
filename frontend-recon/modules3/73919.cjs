// webpack module 73919 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = n.aTypedArray;
var o = n.exportTypedArrayMethod;
var a = [].join;
o("join", function (e) {
  return a.apply(i(this), arguments);
});
};
