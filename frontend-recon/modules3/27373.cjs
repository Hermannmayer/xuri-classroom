// webpack module 27373 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./19706.js").filter;
var o = require("./51052.js");
var a = n.aTypedArray;
var s = n.aTypedArrayConstructor;
var u = n.exportTypedArrayMethod;
u("filter", function (e) {
  var t = i(a(this), e, arguments.length > 1 ? arguments[1] : undefined);
  var r = o(this, this.constructor);
  var n = 0;
  var u = t.length;
  var l = new (s(r))(u);
  while (u > n) {
    l[n] = t[n++];
  }
  return l;
});
};
