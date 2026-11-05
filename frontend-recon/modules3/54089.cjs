// webpack module 54089 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./41497.js");
var a = require("./79456.js");
var s = require("./60730.js");
var u = require("./51052.js");
var l = require("./98199.js");
n({
  target: "Set",
  proto: true,
  real: true,
  forced: i
}, {
  intersection: function (e) {
    var t = a(this);
    var r = new (u(t, o("Set")))();
    var n = s(t.has);
    var i = s(r.add);
    l(e, function (e) {
      if (n.call(t, e)) {
        i.call(r, e);
      }
    });
    return r;
  }
});
};
