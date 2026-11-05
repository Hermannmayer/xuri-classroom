// webpack module 67442 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./58513.js");
var o = Math.abs;
n({
  target: "Number",
  stat: true
}, {
  isSafeInteger: function (e) {
    return i(e) && o(e) <= 9007199254740991;
  }
});
};
