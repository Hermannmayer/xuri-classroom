// webpack module 37834 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./79456.js");
var a = require("./56741.js");
var s = require("./98199.js");
n({
  target: "Map",
  proto: true,
  real: true,
  forced: i
}, {
  keyOf: function (e) {
    return s(a(o(this)), function (t, r) {
      if (r === e) {
        return s.stop(t);
      }
    }, undefined, true, true).result;
  }
});
};
