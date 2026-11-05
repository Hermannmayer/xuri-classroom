// webpack module 19634 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./79456.js");
var a = require("./56741.js");
var s = require("./32642.js");
var u = require("./98199.js");
n({
  target: "Map",
  proto: true,
  real: true,
  forced: i
}, {
  includes: function (e) {
    return u(a(o(this)), function (t, r) {
      if (s(r, e)) {
        return u.stop();
      }
    }, undefined, true, true).stopped;
  }
});
};
