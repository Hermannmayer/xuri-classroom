// webpack module 70653 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = require("./24012.js");
var o = require("./27015.js");
var a = n.Int8Array;
var s = i.aTypedArray;
var u = i.exportTypedArrayMethod;
var l = [].toLocaleString;
var c = [].slice;
var p = !!a && o(function () {
  l.call(new a(1));
});
var d = o(function () {
  return [1, 2].toLocaleString() != new a([1, 2]).toLocaleString();
}) || !o(function () {
  a.prototype.toLocaleString.call([1, 2]);
});
u("toLocaleString", function () {
  return l.apply(p ? c.call(s(this)) : s(this), arguments);
}, d);
};
