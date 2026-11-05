// webpack module 43332 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./28445.js");
module.exports = function (e) {
  if (typeof e != "number" && n(e) != "Number") {
    throw TypeError("Incorrect invocation");
  }
  return +e;
};
};
