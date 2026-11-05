// webpack module 7316 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = require("./5659.js");
var o = n.document;
var a = i(o) && i(o.createElement);
module.exports = function (e) {
  if (a) {
    return o.createElement(e);
  } else {
    return {};
  }
};
};
