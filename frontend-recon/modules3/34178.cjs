// webpack module 34178 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./73727.js");
function i(e, t) {
  for (var r = 0; r < t.length; r++) {
    var i = t[r];
    i.enumerable = i.enumerable || false;
    i.configurable = true;
    if ("value" in i) {
      i.writable = true;
    }
    Object.defineProperty(e, n(i.key), i);
  }
}
function o(e, t, r) {
  if (t) {
    i(e.prototype, t);
  }
  if (r) {
    i(e, r);
  }
  Object.defineProperty(e, "prototype", {
    writable: false
  });
  return e;
}
module.exports = o;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
