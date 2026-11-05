// webpack module 89876 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./79456.js");
var i = require("./45867.js");
module.exports = function (e) {
  if (e !== "string" && e !== "number" && e !== "default") {
    throw TypeError("Incorrect hint");
  }
  return i(n(this), e !== "number");
};
};
