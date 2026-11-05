// webpack module 31856 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./92695.js");
var i = require("./81504.js");
var o = require("./66845.js");
var a = require("./22674.js").f;
function s(e) {
  return function (t) {
    var r;
    var s = o(t);
    var u = i(s);
    var l = u.length;
    var c = 0;
    var p = [];
    while (l > c) {
      r = u[c++];
      if (!n || !!a.call(s, r)) {
        p.push(e ? [r, s[r]] : s[r]);
      }
    }
    return p;
  };
}
module.exports = {
  entries: s(true),
  values: s(false)
};
};
