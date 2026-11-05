// webpack module 9507 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./16902.js");
var i = Object.prototype;
var o = i.hasOwnProperty;
var a = i.toString;
var s = n ? n.toStringTag : undefined;
function u(e) {
  var t = o.call(e, s);
  var r = e[s];
  try {
    e[s] = undefined;
    var n = true;
  } catch (u) {}
  var i = a.call(e);
  if (n) {
    if (t) {
      e[s] = r;
    } else {
      delete e[s];
    }
  }
  return i;
}
module.exports = u;
};
