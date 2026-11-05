// webpack module 68178 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./5659.js");
var o = require("./74804.js").onFreeze;
var a = require("./55073.js");
var s = require("./27015.js");
var u = Object.seal;
var l = s(function () {
  u(1);
});
n({
  target: "Object",
  stat: true,
  forced: l,
  sham: !a
}, {
  seal: function (e) {
    if (u && i(e)) {
      return u(o(e));
    } else {
      return e;
    }
  }
});
};
