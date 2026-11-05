// webpack module 60421 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./40948.js");
var o = require("./79456.js");
var a = i.toKey;
var s = i.set;
n({
  target: "Reflect",
  stat: true
}, {
  metadata: function (e, t) {
    return function (r, n) {
      s(e, t, o(r), a(n));
    };
  }
});
};
