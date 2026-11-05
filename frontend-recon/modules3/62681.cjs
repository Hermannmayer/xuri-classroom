// webpack module 62681 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./49674.js");
var o = [].reverse;
var a = [1, 2];
n({
  target: "Array",
  proto: true,
  forced: String(a) === String(a.reverse())
}, {
  reverse: function () {
    if (i(this)) {
      this.length = this.length;
    }
    return o.call(this);
  }
});
};
