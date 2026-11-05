// webpack module 63071 — body from webcrack
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
  difference: function (e) {
    var t = a(this);
    var r = new (u(t, o("Set")))(t);
    var n = s(r.delete);
    l(e, function (e) {
      n.call(r, e);
    });
    return r;
  }
});
};
