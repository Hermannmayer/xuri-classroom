// webpack module 85339 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./79456.js");
var a = require("./52485.js");
var s = require("./56741.js");
var u = require("./98199.js");
n({
  target: "Map",
  proto: true,
  real: true,
  forced: i
}, {
  every: function (e) {
    var t = o(this);
    var r = s(t);
    var n = a(e, arguments.length > 1 ? arguments[1] : undefined, 3);
    return !u(r, function (e, r) {
      if (!n(r, e, t)) {
        return u.stop();
      }
    }, undefined, true, true).stopped;
  }
});
};
