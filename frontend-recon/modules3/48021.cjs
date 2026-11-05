// webpack module 48021 — body from webcrack
module.exports = function (module, exports, require) {
var t = "\\ud800-\\udfff";
var r = "\\u0300-\\u036f";
var n = "\\ufe20-\\ufe2f";
var i = "\\u20d0-\\u20ff";
var o = r + n + i;
var a = "\\u2700-\\u27bf";
var s = "a-z\\xdf-\\xf6\\xf8-\\xff";
var u = "\\xac\\xb1\\xd7\\xf7";
var l = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf";
var c = "\\u2000-\\u206f";
var p = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000";
var d = "A-Z\\xc0-\\xd6\\xd8-\\xde";
var f = "\\ufe0e\\ufe0f";
var g = u + l + c + p;
var m = "['’]";
var v = "[" + g + "]";
var y = "[" + o + "]";
var h = "\\d+";
var b = "[" + a + "]";
var w = "[" + s + "]";
var x = "[^" + t + g + h + a + s + d + "]";
var E = "\\ud83c[\\udffb-\\udfff]";
var k = "(?:" + y + "|" + E + ")";
var S = "[^" + t + "]";
var T = "(?:\\ud83c[\\udde6-\\uddff]){2}";
var C = "[\\ud800-\\udbff][\\udc00-\\udfff]";
var A = "[" + d + "]";
var _ = "\\u200d";
var O = "(?:" + w + "|" + x + ")";
var M = "(?:" + A + "|" + x + ")";
var P = "(?:" + m + "(?:d|ll|m|re|s|t|ve))?";
var q = "(?:" + m + "(?:D|LL|M|RE|S|T|VE))?";
var N = k + "?";
var R = "[" + f + "]?";
var I = "(?:" + _ + "(?:" + [S, T, C].join("|") + ")" + R + N + ")*";
var j = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])";
var D = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])";
var L = R + N + I;
var F = "(?:" + [b, T, C].join("|") + ")" + L;
var Z = RegExp([A + "?" + w + "+" + P + "(?=" + [v, A, "$"].join("|") + ")", M + "+" + q + "(?=" + [v, A + O, "$"].join("|") + ")", A + "?" + O + "+" + P, A + "+" + q, D, j, h, F].join("|"), "g");
function z(e) {
  return e.match(Z) || [];
}
module.exports = z;
};
