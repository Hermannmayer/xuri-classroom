// webpack module 21273 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60730.js");
var i = require("./5659.js");
var o = [].slice;
var a = {};
function s(e, t, r) {
  if (!(t in a)) {
    var n = [];
    for (var i = 0; i < t; i++) {
      n[i] = "a[" + i + "]";
    }
    a[t] = Function("C,a", "return new C(" + n.join(",") + ")");
  }
  return a[t](e, r);
}
module.exports = Function.bind || function (e) {
  var t = n(this);
  var r = o.call(arguments, 1);
  function a() {
    var n = r.concat(o.call(arguments));
    if (this instanceof a) {
      return s(t, n.length, n);
    } else {
      return t.apply(e, n);
    }
  }
  if (i(t.prototype)) {
    a.prototype = t.prototype;
  }
  return a;
};
};
