// webpack module 47025 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./79456.js");
var o = Object.isExtensible;
n({
  target: "Reflect",
  stat: true
}, {
  isExtensible: function (e) {
    i(e);
    return !o || o(e);
  }
});
};
