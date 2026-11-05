// webpack module 53045 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = Math.ceil;
var o = Math.floor;
n({
  target: "Math",
  stat: true
}, {
  trunc: function (e) {
    return (e > 0 ? o : i)(e);
  }
});
};
