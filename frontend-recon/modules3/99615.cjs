// webpack module 99615 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./27015.js");
var o = require("./5659.js");
var a = Object.isExtensible;
var s = i(function () {
  a(1);
});
n({
  target: "Object",
  stat: true,
  forced: s
}, {
  isExtensible: function (e) {
    return !!o(e) && (!a || a(e));
  }
});
};
