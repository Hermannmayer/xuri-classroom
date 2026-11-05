// webpack module 25829 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
n({
  target: "Reflect",
  stat: true
}, {
  has: function (e, t) {
    return t in e;
  }
});
};
