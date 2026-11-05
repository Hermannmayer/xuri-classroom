// webpack module 80930 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./67570.js").indexOf;
var o = require("./43719.js");
var a = require("./24396.js");
var s = [].indexOf;
var u = !!s && 1 / [1].indexOf(1, -0) < 0;
var l = o("indexOf");
var c = a("indexOf", {
  ACCESSORS: true,
  1: 0
});
n({
  target: "Array",
  proto: true,
  forced: u || !l || !c
}, {
  indexOf: function (e) {
    if (u) {
      return s.apply(this, arguments) || 0;
    } else {
      return i(this, e, arguments.length > 1 ? arguments[1] : undefined);
    }
  }
});
};
