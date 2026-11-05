// webpack module 1586 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./49674.js");
var i = require("./4484.js");
var o = require("./52485.js");
function a(e, t, r, s, u, l, c, p) {
  var d;
  var f = u;
  var g = 0;
  var m = !!c && o(c, p, 3);
  while (g < s) {
    if (g in r) {
      d = m ? m(r[g], g, t) : r[g];
      if (l > 0 && n(d)) {
        f = a(e, t, d, i(d.length), f, l - 1) - 1;
      } else {
        if (f >= 9007199254740991) {
          throw TypeError("Exceed the acceptable array length");
        }
        e[f] = d;
      }
      f++;
    }
    g++;
  }
  return f;
}
module.exports = a;
};
