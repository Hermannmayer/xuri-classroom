// webpack module 85243 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./16711.js");
var i = require("./81915.js");
var o = require("./91119.js");
var a = require("./6613.js");
function s(e) {
  return function (t) {
    t = a(t);
    var r = i(t) ? o(t) : undefined;
    var s = r ? r[0] : t.charAt(0);
    var u = r ? n(r, 1).join("") : t.slice(1);
    return s[e]() + u;
  };
}
module.exports = s;
};
