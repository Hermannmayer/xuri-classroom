// webpack module 19706 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./52485.js");
var i = require("./95051.js");
var o = require("./41630.js");
var a = require("./4484.js");
var s = require("./99180.js");
var u = [].push;
function l(e) {
  var t = e == 1;
  var r = e == 2;
  var l = e == 3;
  var c = e == 4;
  var p = e == 6;
  var d = e == 5 || p;
  return function (f, g, m, v) {
    var y;
    var h;
    var b = o(f);
    var w = i(b);
    var x = n(g, m, 3);
    for (var E = a(w.length), k = 0, S = v || s, T = t ? S(f, E) : r ? S(f, 0) : undefined; E > k; k++) {
      if ((d || k in w) && (y = w[k], h = x(y, k, b), e)) {
        if (t) {
          T[k] = h;
        } else if (h) {
          switch (e) {
            case 3:
              return true;
            case 5:
              return y;
            case 6:
              return k;
            case 2:
              u.call(T, y);
          }
        } else if (c) {
          return false;
        }
      }
    }
    if (p) {
      return -1;
    } else if (l || c) {
      return c;
    } else {
      return T;
    }
  };
}
module.exports = {
  forEach: l(0),
  map: l(1),
  filter: l(2),
  some: l(3),
  every: l(4),
  find: l(5),
  findIndex: l(6)
};
};
