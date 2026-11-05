// webpack module 30507 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./19706.js").map;
var o = require("./51052.js");
var a = n.aTypedArray;
var s = n.aTypedArrayConstructor;
var u = n.exportTypedArrayMethod;
u("map", function (e) {
  return i(a(this), e, arguments.length > 1 ? arguments[1] : undefined, function (e, t) {
    return new (s(o(e, e.constructor)))(t);
  });
});
};
