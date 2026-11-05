// webpack module 61052 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./27015.js");
var o = require("./49674.js");
var a = require("./5659.js");
var s = require("./41630.js");
var u = require("./4484.js");
var l = require("./22175.js");
var c = require("./99180.js");
var p = require("./81828.js");
var d = require("./55878.js");
var f = require("./27481.js");
var g = d("isConcatSpreadable");
var m = 9007199254740991;
var v = "Maximum allowed index exceeded";
var y = f >= 51 || !i(function () {
  var e = [];
  e[g] = false;
  return e.concat()[0] !== e;
});
var h = p("concat");
function b(e) {
  if (!a(e)) {
    return false;
  }
  var t = e[g];
  if (t !== undefined) {
    return !!t;
  } else {
    return o(e);
  }
}
var w = !y || !h;
n({
  target: "Array",
  proto: true,
  forced: w
}, {
  concat: function (e) {
    var t;
    var r;
    var n;
    var i;
    var o;
    var a = s(this);
    var p = c(a, 0);
    var d = 0;
    t = -1;
    n = arguments.length;
    for (; t < n; t++) {
      o = t === -1 ? a : arguments[t];
      if (b(o)) {
        i = u(o.length);
        if (d + i > m) {
          throw TypeError(v);
        }
        for (r = 0; r < i; r++, d++) {
          if (r in o) {
            l(p, d, o[r]);
          }
        }
      } else {
        if (d >= m) {
          throw TypeError(v);
        }
        l(p, d++, o);
      }
    }
    p.length = d;
    return p;
  }
});
};
