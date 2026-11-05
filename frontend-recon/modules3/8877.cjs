// webpack module 8877 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60730.js");
var i = require("./41630.js");
var o = require("./95051.js");
var a = require("./4484.js");
function s(e) {
  return function (t, r, s, u) {
    n(r);
    var l = i(t);
    var c = o(l);
    var p = a(l.length);
    var d = e ? p - 1 : 0;
    var f = e ? -1 : 1;
    if (s < 2) {
      while (1) {
        if (d in c) {
          u = c[d];
          d += f;
          break;
        }
        d += f;
        if (e ? d < 0 : p <= d) {
          throw TypeError("Reduce of empty array with no initial value");
        }
      }
    }
    for (; e ? d >= 0 : p > d; d += f) {
      if (d in c) {
        u = r(u, c[d], d, l);
      }
    }
    return u;
  };
}
module.exports = {
  left: s(false),
  right: s(true)
};
};
