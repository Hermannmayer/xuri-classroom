// webpack module 10428 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./79456.js");
var a = require("./60730.js");
var s = require("./98199.js");
n({
  target: "Set",
  proto: true,
  real: true,
  forced: i
}, {
  isDisjointFrom: function (e) {
    var t = o(this);
    var r = a(t.has);
    return !s(e, function (e) {
      if (r.call(t, e) === true) {
        return s.stop();
      }
    }).stopped;
  }
});
};
