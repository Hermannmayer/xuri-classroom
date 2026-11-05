// webpack module 8673 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./74848.js").end;
var o = require("./86220.js");
var a = o("trimEnd");
var s = a ? function () {
  return i(this);
} : "".trimEnd;
n({
  target: "String",
  proto: true,
  forced: a
}, {
  trimEnd: s,
  trimRight: s
});
};
