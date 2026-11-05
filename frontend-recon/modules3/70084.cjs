// webpack module 70084 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./74848.js").start;
var o = require("./86220.js");
var a = o("trimStart");
var s = a ? function () {
  return i(this);
} : "".trimStart;
n({
  target: "String",
  proto: true,
  forced: a
}, {
  trimStart: s,
  trimLeft: s
});
};
