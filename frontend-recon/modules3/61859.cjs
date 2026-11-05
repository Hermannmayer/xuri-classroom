// webpack module 61859 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./78426.js");
var i = require("./61230.js");
function o(e) {
  return function (t, r) {
    var o;
    var a;
    var s = String(i(t));
    var u = n(r);
    var l = s.length;
    if (u < 0 || u >= l) {
      if (e) {
        return "";
      } else {
        return undefined;
      }
    } else {
      o = s.charCodeAt(u);
      if (o < 55296 || o > 56319 || u + 1 === l || (a = s.charCodeAt(u + 1)) < 56320 || a > 57343) {
        if (e) {
          return s.charAt(u);
        } else {
          return o;
        }
      } else if (e) {
        return s.slice(u, u + 2);
      } else {
        return a - 56320 + (o - 55296 << 10) + 65536;
      }
    }
  };
}
module.exports = {
  codeAt: o(false),
  charAt: o(true)
};
};
