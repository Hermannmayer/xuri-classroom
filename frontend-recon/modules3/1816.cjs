// webpack module 1816 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = n.aTypedArray;
var o = n.exportTypedArrayMethod;
var a = Math.floor;
o("reverse", function () {
  var e;
  var t = this;
  var r = i(t).length;
  var n = a(r / 2);
  var o = 0;
  while (o < n) {
    e = t[o];
    t[o++] = t[--r];
    t[r] = e;
  }
  return t;
});
};
