// webpack module 72945 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./41497.js");
var a = require("./79456.js");
var s = require("./60730.js");
var u = require("./52485.js");
var l = require("./51052.js");
var c = require("./89170.js");
var p = require("./98199.js");
n({
  target: "Set",
  proto: true,
  real: true,
  forced: i
}, {
  filter: function (e) {
    var t = a(this);
    var r = c(t);
    var n = u(e, arguments.length > 1 ? arguments[1] : undefined, 3);
    var i = new (l(t, o("Set")))();
    var d = s(i.add);
    p(r, function (e) {
      if (n(e, e, t)) {
        d.call(i, e);
      }
    }, undefined, false, true);
    return i;
  }
});
};
