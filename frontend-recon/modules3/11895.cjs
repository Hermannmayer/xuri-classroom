// webpack module 11895 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55309.js");
function i(e, t) {
  var r;
  var i = null;
  if (!e || typeof e !== "string") {
    return i;
  }
  var o;
  var a;
  var s = n(e);
  var u = typeof t === "function";
  for (var l = 0, c = s.length; l < c; l++) {
    r = s[l];
    o = r.property;
    a = r.value;
    if (u) {
      t(o, a, r);
    } else if (a) {
      i ||= {};
      i[o] = a;
    }
  }
  return i;
}
module.exports = i;
module.exports.default = i;
};
