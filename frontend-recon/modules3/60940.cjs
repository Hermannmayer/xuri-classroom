// webpack module 60940 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = require("./68269.js");
var o = require("./98432.js");
var a = require("./52141.js");
var s = require("./55878.js");
var u = s("iterator");
var l = s("toStringTag");
var c = o.values;
for (var p in i) {
  var d = n[p];
  var f = d && d.prototype;
  if (f) {
    if (f[u] !== c) {
      try {
        a(f, u, c);
      } catch (m) {
        f[u] = c;
      }
    }
    if (!f[l]) {
      a(f, l, p);
    }
    if (i[p]) {
      for (var g in o) {
        if (f[g] !== o[g]) {
          try {
            a(f, g, o[g]);
          } catch (m) {
            f[g] = o[g];
          }
        }
      }
    }
  }
}
};
