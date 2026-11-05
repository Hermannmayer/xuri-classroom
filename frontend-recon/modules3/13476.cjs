// webpack module 13476 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./61230.js");
var i = /"/g;
module.exports = function (e, t, r, o) {
  var a = String(n(e));
  var s = "<" + t;
  if (r !== "") {
    s += " " + r + "=\"" + String(o).replace(i, "&quot;") + "\"";
  }
  return s + ">" + a + "</" + t + ">";
};
};
