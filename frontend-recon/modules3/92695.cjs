// webpack module 92695 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./27015.js");
module.exports = !n(function () {
  return Object.defineProperty({}, 1, {
    get: function () {
      return 7;
    }
  })[1] != 7;
});
};
