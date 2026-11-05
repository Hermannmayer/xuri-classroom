// webpack module 63469 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./89120.js");
var i = require("./89460.js");
var o = "Expected a function";
function a(e, t, r) {
  var a = true;
  var s = true;
  if (typeof e != "function") {
    throw new TypeError(o);
  }
  if (i(r)) {
    a = "leading" in r ? !!r.leading : a;
    s = "trailing" in r ? !!r.trailing : s;
  }
  return n(e, t, {
    leading: a,
    maxWait: t,
    trailing: s
  });
}
module.exports = a;
};
