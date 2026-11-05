// webpack module 74848 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./61230.js");
var i = require("./38134.js");
var o = "[" + i + "]";
var a = RegExp("^" + o + o + "*");
var s = RegExp(o + o + "*$");
function u(e) {
  return function (t) {
    var r = String(n(t));
    if (e & 1) {
      r = r.replace(a, "");
    }
    if (e & 2) {
      r = r.replace(s, "");
    }
    return r;
  };
}
module.exports = {
  start: u(1),
  end: u(2),
  trim: u(3)
};
};
