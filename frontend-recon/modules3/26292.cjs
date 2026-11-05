// webpack module 26292 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./41497.js");
var o = require("./79456.js");
var a = require("./55073.js");
n({
  target: "Reflect",
  stat: true,
  sham: !a
}, {
  preventExtensions: function (e) {
    o(e);
    try {
      var t = i("Object", "preventExtensions");
      if (t) {
        t(e);
      }
      return true;
    } catch (r) {
      return false;
    }
  }
});
};
