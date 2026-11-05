// webpack module 13812 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = require("./74848.js").trim;
var o = require("./38134.js");
var a = n.parseFloat;
var s = 1 / a(o + "-0") !== -Infinity;
module.exports = s ? function (e) {
  var t = i(String(e));
  var r = a(t);
  if (r === 0 && t.charAt(0) == "-") {
    return -0;
  } else {
    return r;
  }
} : a;
};
