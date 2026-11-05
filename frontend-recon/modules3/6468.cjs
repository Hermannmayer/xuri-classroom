// webpack module 6468 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./27015.js");
module.exports = !n(function () {
  function e() {}
  e.prototype.constructor = null;
  return Object.getPrototypeOf(new e()) !== e.prototype;
});
};
