// webpack module 94838 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./79456.js");
module.exports = function (e, t, r, i) {
  try {
    if (i) {
      return t(n(r)[0], r[1]);
    } else {
      return t(r);
    }
  } catch (a) {
    var o = e.return;
    if (o !== undefined) {
      n(o.call(e));
    }
    throw a;
  }
};
};
