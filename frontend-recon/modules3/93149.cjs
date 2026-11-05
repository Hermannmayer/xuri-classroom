// webpack module 93149 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
module.exports = function (e, t) {
  var r = n.console;
  if (r && r.error) {
    if (arguments.length === 1) {
      r.error(e);
    } else {
      r.error(e, t);
    }
  }
};
};
