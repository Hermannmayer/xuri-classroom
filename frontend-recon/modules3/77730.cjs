// webpack module 77730 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./55477.js");
var o = require("./98321.js");
var a = !i.setImmediate || !i.clearImmediate;
n({
  global: true,
  bind: true,
  enumerable: true,
  forced: a
}, {
  setImmediate: o.set,
  clearImmediate: o.clear
});
};
