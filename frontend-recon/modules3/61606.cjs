// webpack module 61606 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./10307.js");
var i = /^\s+/;
function o(e) {
  if (e) {
    return e.slice(0, n(e) + 1).replace(i, "");
  } else {
    return e;
  }
}
module.exports = o;
};
