// webpack module 98199 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./79456.js");
var i = require("./11305.js");
var o = require("./4484.js");
var a = require("./52485.js");
var s = require("./83232.js");
var u = require("./94838.js");
function l(e, t) {
  this.stopped = e;
  this.result = t;
}
var c = module.exports = function (e, t, r, c, p) {
  var d;
  var f;
  var g;
  var m;
  var v;
  var y;
  var h;
  var b = a(t, r, c ? 2 : 1);
  if (p) {
    d = e;
  } else {
    f = s(e);
    if (typeof f != "function") {
      throw TypeError("Target is not iterable");
    }
    if (i(f)) {
      g = 0;
      m = o(e.length);
      for (; m > g; g++) {
        v = c ? b(n(h = e[g])[0], h[1]) : b(e[g]);
        if (v && v instanceof l) {
          return v;
        }
      }
      return new l(false);
    }
    d = f.call(e);
  }
  y = d.next;
  while (!(h = y.call(d)).done) {
    v = u(d, b, h.value, c);
    if (typeof v == "object" && v && v instanceof l) {
      return v;
    }
  }
  return new l(false);
};
c.stop = function (e) {
  return new l(true, e);
};
};
