// webpack module 89792 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./5659.js");
module.exports = function (e) {
  if (!n(e) && e !== null) {
    throw TypeError("Can't set " + String(e) + " as a prototype");
  }
  return e;
};
};
