// webpack module 95002 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./67570.js").includes;
var o = require("./92187.js");
var a = require("./24396.js");
var s = a("indexOf", {
  ACCESSORS: true,
  1: 0
});
n({
  target: "Array",
  proto: true,
  forced: !s
}, {
  includes: function (e) {
    return i(this, e, arguments.length > 1 ? arguments[1] : undefined);
  }
});
o("includes");
};
