// webpack module 54730 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./79456.js");
var a = require("./60730.js");
var s = require("./89170.js");
var u = require("./98199.js");
n({
  target: "Set",
  proto: true,
  real: true,
  forced: i
}, {
  reduce: function (e) {
    var t = o(this);
    var r = s(t);
    var n = arguments.length < 2;
    var i = n ? undefined : arguments[1];
    a(e);
    u(r, function (r) {
      if (n) {
        n = false;
        i = r;
      } else {
        i = e(i, r, r, t);
      }
    }, undefined, false, true);
    if (n) {
      throw TypeError("Reduce of empty set with no initial value");
    }
    return i;
  }
});
};
