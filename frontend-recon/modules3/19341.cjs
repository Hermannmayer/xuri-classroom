// webpack module 19341 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = require("./37987.js").f;
var o = require("./52141.js");
var a = require("./41216.js");
var s = require("./11486.js");
var u = require("./37725.js");
var l = require("./30685.js");
module.exports = function (e, t) {
  var r;
  var c;
  var p;
  var d;
  var f;
  var g;
  var m = e.target;
  var v = e.global;
  var y = e.stat;
  c = v ? n : y ? n[m] || s(m, {}) : (n[m] || {}).prototype;
  if (c) {
    for (p in t) {
      f = t[p];
      if (e.noTargetGet) {
        g = i(c, p);
        d = g && g.value;
      } else {
        d = c[p];
      }
      r = l(v ? p : m + (y ? "." : "#") + p, e.forced);
      if (!r && d !== undefined) {
        if (typeof f === typeof d) {
          continue;
        }
        u(f, d);
      }
      if (e.sham || d && d.sham) {
        o(f, "sham", true);
      }
      a(c, p, f, e);
    }
  }
};
};
