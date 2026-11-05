// webpack module 25305 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./92695.js");
var o = require("./79456.js");
var a = require("./45867.js");
var s = require("./75386.js");
var u = require("./27015.js");
var l = u(function () {
  Reflect.defineProperty(s.f({}, 1, {
    value: 1
  }), 1, {
    value: 2
  });
});
n({
  target: "Reflect",
  stat: true,
  forced: l,
  sham: !i
}, {
  defineProperty: function (e, t, r) {
    o(e);
    var n = a(t, true);
    o(r);
    try {
      s.f(e, n, r);
      return true;
    } catch (i) {
      return false;
    }
  }
});
};
