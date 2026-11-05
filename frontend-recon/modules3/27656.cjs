// webpack module 27656 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./41630.js");
var i = require("./4484.js");
var o = require("./83232.js");
var a = require("./11305.js");
var s = require("./52485.js");
var u = require("./24012.js").aTypedArrayConstructor;
module.exports = function (e) {
  var t;
  var r;
  var l;
  var c;
  var p;
  var d;
  var f = n(e);
  var g = arguments.length;
  var m = g > 1 ? arguments[1] : undefined;
  var v = m !== undefined;
  var y = o(f);
  if (y != undefined && !a(y)) {
    p = y.call(f);
    d = p.next;
    f = [];
    while (!(c = d.call(p)).done) {
      f.push(c.value);
    }
  }
  if (v && g > 2) {
    m = s(m, arguments[2], 2);
  }
  r = i(f.length);
  l = new (u(this))(r);
  t = 0;
  for (; r > t; t++) {
    l[t] = v ? m(f[t], t) : f[t];
  }
  return l;
};
};
