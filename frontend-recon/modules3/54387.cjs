// webpack module 54387 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./19706.js").filter;
var o = require("./81828.js");
var a = require("./24396.js");
var s = o("filter");
var u = a("filter");
n({
  target: "Array",
  proto: true,
  forced: !s || !u
}, {
  filter: function (e) {
    return i(this, e, arguments.length > 1 ? arguments[1] : undefined);
  }
});
};
