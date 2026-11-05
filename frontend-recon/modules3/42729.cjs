// webpack module 42729 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./19706.js").map;
var o = require("./81828.js");
var a = require("./24396.js");
var s = o("map");
var u = a("map");
n({
  target: "Array",
  proto: true,
  forced: !s || !u
}, {
  map: function (e) {
    return i(this, e, arguments.length > 1 ? arguments[1] : undefined);
  }
});
};
