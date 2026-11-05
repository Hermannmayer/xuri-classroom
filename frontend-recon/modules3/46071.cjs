// webpack module 46071 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./92695.js");
var i = require("./92187.js");
var o = require("./41630.js");
var a = require("./4484.js");
var s = require("./75386.js").f;
if (n && !("lastItem" in [])) {
  s(Array.prototype, "lastItem", {
    configurable: true,
    get: function () {
      var e = o(this);
      var t = a(e.length);
      if (t == 0) {
        return undefined;
      } else {
        return e[t - 1];
      }
    },
    set: function (e) {
      var t = o(this);
      var r = a(t.length);
      return t[r == 0 ? 0 : r - 1] = e;
    }
  });
  i("lastItem");
}
};
