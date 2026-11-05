// webpack module 22674 — body from webcrack
module.exports = function (module, exports, require) {
var r = {}.propertyIsEnumerable;
var n = Object.getOwnPropertyDescriptor;
var i = n && !r.call({
  1: 2
}, 1);
exports.f = i ? function (e) {
  var t = n(this, e);
  return !!t && t.enumerable;
} : r;
};
