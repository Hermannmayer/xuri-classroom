// webpack module 24562 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./89407.js");
module.exports = function (e, t) {
  var r = n(e);
  if (r % t) {
    throw RangeError("Wrong offset");
  }
  return r;
};
};
