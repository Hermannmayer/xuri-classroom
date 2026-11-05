// webpack module 36298 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./92695.js");
var i = require("./92187.js");
var o = require("./41630.js");
var a = require("./4484.js");
var s = require("./75386.js").f;
if (n && !("lastIndex" in [])) {
  s(Array.prototype, "lastIndex", {
    configurable: true,
    get: function () {
      var e = o(this);
      var t = a(e.length);
      if (t == 0) {
        return 0;
      } else {
        return t - 1;
      }
    }
  });
  i("lastIndex");
}
};
