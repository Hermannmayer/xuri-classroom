// webpack module 46193 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./79456.js");
var a = require("./52485.js");
var s = require("./89170.js");
var u = require("./98199.js");
n({
  target: "Set",
  proto: true,
  real: true,
  forced: i
}, {
  some: function (e) {
    var t = o(this);
    var r = s(t);
    var n = a(e, arguments.length > 1 ? arguments[1] : undefined, 3);
    return u(r, function (e) {
      if (n(e, e, t)) {
        return u.stop();
      }
    }, undefined, false, true).stopped;
  }
});
};
