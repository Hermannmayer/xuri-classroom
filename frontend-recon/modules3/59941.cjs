// webpack module 59941 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./28004.js").default;
function i(e) {
  if (e != null) {
    var t = e[typeof Symbol == "function" && Symbol.iterator || "@@iterator"];
    var r = 0;
    if (t) {
      return t.call(e);
    }
    if (typeof e.next == "function") {
      return e;
    }
    if (!isNaN(e.length)) {
      return {
        next: function () {
          if (e && r >= e.length) {
            e = undefined;
          }
          return {
            value: e && e[r++],
            done: !e
          };
        }
      };
    }
  }
  throw new TypeError(n(e) + " is not iterable");
}
module.exports = i;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
