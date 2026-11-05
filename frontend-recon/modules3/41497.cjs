// webpack module 41497 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./96370.js");
var i = require("./55477.js");
function o(e) {
  if (typeof e == "function") {
    return e;
  } else {
    return undefined;
  }
}
module.exports = function (e, t) {
  if (arguments.length < 2) {
    return o(n[e]) || o(i[e]);
  } else {
    return n[e] && n[e][t] || i[e] && i[e][t];
  }
};
};
