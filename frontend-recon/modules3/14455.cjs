// webpack module 14455 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./8801.js");
n({
  target: "RegExp",
  proto: true,
  forced: /./.exec !== i
}, {
  exec: i
});
};
