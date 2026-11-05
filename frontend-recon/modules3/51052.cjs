// webpack module 51052 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./79456.js");
var i = require("./60730.js");
var o = require("./55878.js");
var a = o("species");
module.exports = function (e, t) {
  var r;
  var o = n(e).constructor;
  if (o === undefined || (r = n(o)[a]) == undefined) {
    return t;
  } else {
    return i(r);
  }
};
};
