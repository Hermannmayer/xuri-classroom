// webpack module 62961 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19706.js").forEach;
var i = require("./43719.js");
var o = require("./24396.js");
var a = i("forEach");
var s = o("forEach");
module.exports = a && s ? [].forEach : function (e) {
  return n(this, e, arguments.length > 1 ? arguments[1] : undefined);
};
};
