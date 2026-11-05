// webpack module 73313 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./79456.js");
var a = require("./60730.js");
var s = require("./98199.js");
n({
  target: "Map",
  proto: true,
  real: true,
  forced: i
}, {
  merge: function (e) {
    var t = o(this);
    var r = a(t.set);
    var n = 0;
    while (n < arguments.length) {
      s(arguments[n++], r, t, true);
    }
    return t;
  }
});
};
