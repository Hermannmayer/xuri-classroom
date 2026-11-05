// webpack module 81915 — body from webcrack
module.exports = function (module, exports, require) {
var t = "\\ud800-\\udfff";
var r = "\\u0300-\\u036f";
var n = "\\ufe20-\\ufe2f";
var i = "\\u20d0-\\u20ff";
var o = r + n + i;
var a = "\\ufe0e\\ufe0f";
var s = "\\u200d";
var u = RegExp("[" + s + t + o + a + "]");
function l(e) {
  return u.test(e);
}
module.exports = l;
};
