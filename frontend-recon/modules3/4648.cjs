// webpack module 4648 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./79456.js");
var a = require("./60730.js");
var s = require("./56741.js");
var u = require("./98199.js");
n({
  target: "Map",
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
    u(r, function (r, o) {
      if (n) {
        n = false;
        i = o;
      } else {
        i = e(i, o, r, t);
      }
    }, undefined, true, true);
    if (n) {
      throw TypeError("Reduce of empty map with no initial value");
    }
    return i;
  }
});
};
