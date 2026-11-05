// webpack module 67570 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./66845.js");
var i = require("./4484.js");
var o = require("./29477.js");
function a(e) {
  return function (t, r, a) {
    var s;
    var u = n(t);
    var l = i(u.length);
    var c = o(a, l);
    if (e && r != r) {
      while (l > c) {
        s = u[c++];
        if (s != s) {
          return true;
        }
      }
    } else {
      for (; l > c; c++) {
        if ((e || c in u) && u[c] === r) {
          return e || c || 0;
        }
      }
    }
    return !e && -1;
  };
}
module.exports = {
  includes: a(true),
  indexOf: a(false)
};
};
