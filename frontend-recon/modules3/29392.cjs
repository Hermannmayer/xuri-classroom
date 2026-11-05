// webpack module 29392 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./39925.js");
var i = require("./18948.js");
var o = i([n("%String.prototype.indexOf%")]);
module.exports = function (e, t) {
  var r = n(e, !!t);
  if (typeof r === "function" && o(e, ".prototype.") > -1) {
    return i([r]);
  } else {
    return r;
  }
};
};
