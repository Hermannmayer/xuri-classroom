// webpack module 79456 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./5659.js");
module.exports = function (e) {
  if (!n(e)) {
    throw TypeError(String(e) + " is not an object");
  }
  return e;
};
};
