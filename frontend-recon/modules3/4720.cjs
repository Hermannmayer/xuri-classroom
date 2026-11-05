// webpack module 4720 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = Math.PI / 180;
n({
  target: "Math",
  stat: true
}, {
  radians: function (e) {
    return e * i;
  }
});
};
