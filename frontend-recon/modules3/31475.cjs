// webpack module 31475 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./4484.js");
var o = require("./29477.js");
var a = require("./51052.js");
var s = n.aTypedArray;
var u = n.exportTypedArrayMethod;
u("subarray", function (e, t) {
  var r = s(this);
  var n = r.length;
  var u = o(e, n);
  return new (a(r, r.constructor))(r.buffer, r.byteOffset + u * r.BYTES_PER_ELEMENT, i((t === undefined ? n : o(t, n)) - u));
});
};
