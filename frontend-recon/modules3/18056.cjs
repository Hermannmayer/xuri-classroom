// webpack module 18056 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./74848.js").trim;
var o = require("./86220.js");
n({
  target: "String",
  proto: true,
  forced: o("trim")
}, {
  trim: function () {
    return i(this);
  }
});
};
