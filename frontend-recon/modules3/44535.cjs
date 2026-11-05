// webpack module 44535 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./29477.js");
var o = require("./78426.js");
var a = require("./4484.js");
var s = require("./41630.js");
var u = require("./99180.js");
var l = require("./22175.js");
var c = require("./81828.js");
var p = require("./24396.js");
var d = c("splice");
var f = p("splice", {
  ACCESSORS: true,
  0: 0,
  1: 2
});
var g = Math.max;
var m = Math.min;
var v = 9007199254740991;
var y = "Maximum allowed length exceeded";
n({
  target: "Array",
  proto: true,
  forced: !d || !f
}, {
  splice: function (e, t) {
    var r;
    var n;
    var c;
    var p;
    var d;
    var f;
    var h = s(this);
    var b = a(h.length);
    var w = i(e, b);
    var x = arguments.length;
    if (x === 0) {
      r = n = 0;
    } else if (x === 1) {
      r = 0;
      n = b - w;
    } else {
      r = x - 2;
      n = m(g(o(t), 0), b - w);
    }
    if (b + r - n > v) {
      throw TypeError(y);
    }
    c = u(h, n);
    p = 0;
    for (; p < n; p++) {
      d = w + p;
      if (d in h) {
        l(c, p, h[d]);
      }
    }
    c.length = n;
    if (r < n) {
      for (p = w; p < b - n; p++) {
        d = p + n;
        f = p + r;
        if (d in h) {
          h[f] = h[d];
        } else {
          delete h[f];
        }
      }
      for (p = b; p > b - n + r; p--) {
        delete h[p - 1];
      }
    } else if (r > n) {
      for (p = b - n; p > w; p--) {
        d = p + n - 1;
        f = p + r - 1;
        if (d in h) {
          h[f] = h[d];
        } else {
          delete h[f];
        }
      }
    }
    for (p = 0; p < r; p++) {
      h[p + w] = arguments[p + 2];
    }
    h.length = b - n + r;
    return c;
  }
});
};
