// webpack module 14201 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./79456.js");
var o = require("./97110.js");
var a = require("./8148.js");
var s = require("./71478.js");
var u = "Seeded Random";
var l = u + " Generator";
var c = s.set;
var p = s.getterFor(l);
var d = "Math.seededPRNG() argument should have a \"seed\" field with a finite value.";
var f = a(function (e) {
  c(this, {
    type: l,
    seed: e % 2147483647
  });
}, u, function () {
  var e = p(this);
  var t = e.seed = (e.seed * 1103515245 + 12345) % 2147483647;
  return {
    value: (t & 1073741823) / 1073741823,
    done: false
  };
});
n({
  target: "Math",
  stat: true,
  forced: true
}, {
  seededPRNG: function (e) {
    var t = i(e).seed;
    if (!o(t)) {
      throw TypeError(d);
    }
    return new f(t);
  }
});
};
