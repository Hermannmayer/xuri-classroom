// webpack module 19397 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./8877.js").left;
var o = require("./43719.js");
var a = require("./24396.js");
var s = o("reduce");
var u = a("reduce", {
  1: 0
});
n({
  target: "Array",
  proto: true,
  forced: !s || !u
}, {
  reduce: function (e) {
    return i(this, e, arguments.length, arguments.length > 1 ? arguments[1] : undefined);
  }
});
};
