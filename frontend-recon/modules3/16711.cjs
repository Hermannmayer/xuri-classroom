// webpack module 16711 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./46652.js");
function i(e, t, r) {
  var i = e.length;
  r = r === undefined ? i : r;
  if (!t && r >= i) {
    return e;
  } else {
    return n(e, t, r);
  }
}
module.exports = i;
};
