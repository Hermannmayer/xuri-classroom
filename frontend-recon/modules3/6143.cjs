// webpack module 6143 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./15595.js");
var i = require("./66845.js");
var o = require("./67570.js").indexOf;
var a = require("./22365.js");
module.exports = function (e, t) {
  var r;
  var s = i(e);
  var u = 0;
  var l = [];
  for (r in s) {
    if (!n(a, r) && n(s, r)) {
      l.push(r);
    }
  }
  while (t.length > u) {
    if (n(s, r = t[u++])) {
      if (!~o(l, r)) {
        l.push(r);
      }
    }
  }
  return l;
};
};
