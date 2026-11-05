// webpack module 80088 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./35606.js");
var o = n.aTypedArrayConstructor;
var a = n.exportTypedArrayStaticMethod;
a("of", function () {
  var e = 0;
  var t = arguments.length;
  var r = new (o(this))(t);
  while (t > e) {
    r[e] = arguments[e++];
  }
  return r;
}, i);
};
