// webpack module 21339 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = require("./68269.js");
var o = require("./62961.js");
var a = require("./52141.js");
for (var s in i) {
  var u = n[s];
  var l = u && u.prototype;
  if (l && l.forEach !== o) {
    try {
      a(l, "forEach", o);
    } catch (c) {
      l.forEach = o;
    }
  }
}
};
