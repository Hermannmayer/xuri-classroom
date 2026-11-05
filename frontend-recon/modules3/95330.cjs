// webpack module 95330 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./92695.js");
var i = require("./75386.js");
var o = require("./79456.js");
var a = require("./81504.js");
module.exports = n ? Object.defineProperties : function (e, t) {
  o(e);
  var r;
  var n = a(t);
  var s = n.length;
  var u = 0;
  while (s > u) {
    i.f(e, r = n[u++], t[r]);
  }
  return e;
};
};
