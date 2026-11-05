// webpack module 15251 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./41497.js");
var o = require("./60730.js");
var a = require("./79456.js");
var s = require("./27015.js");
var u = i("Reflect", "apply");
var l = Function.apply;
var c = !s(function () {
  u(function () {});
});
n({
  target: "Reflect",
  stat: true,
  forced: c
}, {
  apply: function (e, t, r) {
    o(e);
    a(r);
    if (u) {
      return u(e, t, r);
    } else {
      return l.call(e, t, r);
    }
  }
});
};
