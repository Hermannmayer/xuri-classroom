// webpack module 73222 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./16902.js");
var i = require("./95539.js");
var o = require("./65730.js");
var a = require("./88046.js");
var s = Infinity;
var u = n ? n.prototype : undefined;
var l = u ? u.toString : undefined;
function c(e) {
  if (typeof e == "string") {
    return e;
  }
  if (o(e)) {
    return i(e, c) + "";
  }
  if (a(e)) {
    if (l) {
      return l.call(e);
    } else {
      return "";
    }
  }
  var t = e + "";
  if (t == "0" && 1 / e == -s) {
    return "-0";
  } else {
    return t;
  }
}
module.exports = c;
};
