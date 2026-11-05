// webpack module 71575 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
n({
  target: "URL",
  proto: true,
  enumerable: true
}, {
  toJSON: function () {
    return URL.prototype.toString.call(this);
  }
});
};
