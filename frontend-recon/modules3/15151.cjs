// webpack module 15151 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./52485.js");
var i = require("./41630.js");
var o = require("./94838.js");
var a = require("./11305.js");
var s = require("./4484.js");
var u = require("./22175.js");
var l = require("./83232.js");
module.exports = function (e) {
  var t;
  var r;
  var c;
  var p;
  var d;
  var f;
  var g = i(e);
  var m = typeof this == "function" ? this : Array;
  var v = arguments.length;
  var y = v > 1 ? arguments[1] : undefined;
  var h = y !== undefined;
  var b = l(g);
  var w = 0;
  if (h) {
    y = n(y, v > 2 ? arguments[2] : undefined, 2);
  }
  if (b == undefined || m == Array && a(b)) {
    t = s(g.length);
    r = new m(t);
    for (; t > w; w++) {
      f = h ? y(g[w], w) : g[w];
      u(r, w, f);
    }
  } else {
    p = b.call(g);
    d = p.next;
    r = new m();
    for (; !(c = d.call(p)).done; w++) {
      f = h ? o(p, y, [c.value, w], true) : c.value;
      u(r, w, f);
    }
  }
  r.length = w;
  return r;
};
};
