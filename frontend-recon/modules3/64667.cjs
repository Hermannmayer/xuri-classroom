// webpack module 64667 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./41497.js");
var a = require("./79456.js");
var s = require("./60730.js");
var u = require("./48167.js");
var l = require("./98199.js");
n({
  target: "Set",
  proto: true,
  real: true,
  forced: i
}, {
  isSubsetOf: function (e) {
    var t = u(this);
    var r = a(e);
    var n = r.has;
    if (typeof n != "function") {
      r = new (o("Set"))(e);
      n = s(r.has);
    }
    return !l(t, function (e) {
      if (n.call(r, e) === false) {
        return l.stop();
      }
    }, undefined, false, true).stopped;
  }
});
};
