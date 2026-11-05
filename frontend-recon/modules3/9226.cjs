// webpack module 9226 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./55073.js");
var o = require("./27015.js");
var a = require("./5659.js");
var s = require("./74804.js").onFreeze;
var u = Object.freeze;
var l = o(function () {
  u(1);
});
n({
  target: "Object",
  stat: true,
  forced: l,
  sham: !i
}, {
  freeze: function (e) {
    if (u && a(e)) {
      return u(s(e));
    } else {
      return e;
    }
  }
});
};
