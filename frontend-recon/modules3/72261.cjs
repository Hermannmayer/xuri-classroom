// webpack module 72261 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./5659.js");
var o = require("./49674.js");
var a = require("./29477.js");
var s = require("./4484.js");
var u = require("./66845.js");
var l = require("./22175.js");
var c = require("./55878.js");
var p = require("./81828.js");
var d = require("./24396.js");
var f = p("slice");
var g = d("slice", {
  ACCESSORS: true,
  0: 0,
  1: 2
});
var m = c("species");
var v = [].slice;
var y = Math.max;
n({
  target: "Array",
  proto: true,
  forced: !f || !g
}, {
  slice: function (e, t) {
    var r;
    var n;
    var c;
    var p = u(this);
    var d = s(p.length);
    var f = a(e, d);
    var g = a(t === undefined ? d : t, d);
    if (o(p) && (r = p.constructor, typeof r != "function" || r !== Array && !o(r.prototype) ? i(r) && (r = r[m], r === null && (r = undefined)) : r = undefined, r === Array || r === undefined)) {
      return v.call(p, f, g);
    }
    n = new (r === undefined ? Array : r)(y(g - f, 0));
    c = 0;
    for (; f < g; f++, c++) {
      if (f in p) {
        l(n, c, p[f]);
      }
    }
    n.length = c;
    return n;
  }
});
};
