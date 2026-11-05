// webpack module 24297 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./92695.js");
var i = require("./55477.js");
var o = require("./30685.js");
var a = require("./41216.js");
var s = require("./15595.js");
var u = require("./28445.js");
var l = require("./73900.js");
var c = require("./45867.js");
var p = require("./27015.js");
var d = require("./18203.js");
var f = require("./2381.js").f;
var g = require("./37987.js").f;
var m = require("./75386.js").f;
var v = require("./74848.js").trim;
var y = "Number";
var h = i[y];
var b = h.prototype;
var w = u(d(b)) == y;
function x(e) {
  var t;
  var r;
  var n;
  var i;
  var o;
  var a;
  var s;
  var u;
  var l = c(e, false);
  if (typeof l == "string" && l.length > 2) {
    l = v(l);
    t = l.charCodeAt(0);
    if (t === 43 || t === 45) {
      r = l.charCodeAt(2);
      if (r === 88 || r === 120) {
        return NaN;
      }
    } else if (t === 48) {
      switch (l.charCodeAt(1)) {
        case 66:
        case 98:
          n = 2;
          i = 49;
          break;
        case 79:
        case 111:
          n = 8;
          i = 55;
          break;
        default:
          return +l;
      }
      o = l.slice(2);
      a = o.length;
      s = 0;
      for (; s < a; s++) {
        u = o.charCodeAt(s);
        if (u < 48 || u > i) {
          return NaN;
        }
      }
      return parseInt(o, n);
    }
  }
  return +l;
}
if (o(y, !h(" 0o1") || !h("0b1") || h("+0x1"))) {
  var E;
  var k = function (e) {
    var t = arguments.length < 1 ? 0 : e;
    var r = this;
    if (r instanceof k && (w ? p(function () {
      b.valueOf.call(r);
    }) : u(r) != y)) {
      return l(new h(x(t)), r, k);
    } else {
      return x(t);
    }
  };
  for (var S = n ? f(h) : "MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,EPSILON,isFinite,isInteger,isNaN,isSafeInteger,MAX_SAFE_INTEGER,MIN_SAFE_INTEGER,parseFloat,parseInt,isInteger".split(","), T = 0; S.length > T; T++) {
    if (s(h, E = S[T]) && !s(k, E)) {
      m(k, E, g(h, E));
    }
  }
  k.prototype = b;
  b.constructor = k;
  a(i, y, k);
}
};
