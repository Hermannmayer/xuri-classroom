// webpack module 90401 — body from webcrack
module.exports = function (module, exports, require) {
var t = "\\ud800-\\udfff";
var r = "\\u0300-\\u036f";
var n = "\\ufe20-\\ufe2f";
var i = "\\u20d0-\\u20ff";
var o = r + n + i;
var a = "\\ufe0e\\ufe0f";
var s = "[" + t + "]";
var u = "[" + o + "]";
var l = "\\ud83c[\\udffb-\\udfff]";
var c = "(?:" + u + "|" + l + ")";
var p = "[^" + t + "]";
var d = "(?:\\ud83c[\\udde6-\\uddff]){2}";
var f = "[\\ud800-\\udbff][\\udc00-\\udfff]";
var g = "\\u200d";
var m = c + "?";
var v = "[" + a + "]?";
var y = "(?:" + g + "(?:" + [p, d, f].join("|") + ")" + v + m + ")*";
var h = v + m + y;
var b = "(?:" + [p + u + "?", u, d, f, s].join("|") + ")";
var w = RegExp(l + "(?=" + l + ")|" + b + h, "g");
function x(e) {
  return e.match(w) || [];
}
module.exports = x;
};
