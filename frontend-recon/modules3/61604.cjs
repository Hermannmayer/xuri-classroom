// webpack module 61604 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./51052.js");
var o = require("./27015.js");
var a = n.aTypedArray;
var s = n.aTypedArrayConstructor;
var u = n.exportTypedArrayMethod;
var l = [].slice;
var c = o(function () {
  new Int8Array(1).slice();
});
u("slice", function (e, t) {
  var r = l.call(a(this), e, t);
  var n = i(this, this.constructor);
  var o = 0;
  var u = r.length;
  var c = new (s(n))(u);
  while (u > o) {
    c[o] = r[o++];
  }
  return c;
}, c);
};
