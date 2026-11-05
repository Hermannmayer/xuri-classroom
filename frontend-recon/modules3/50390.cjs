// webpack module 50390 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./19706.js").findIndex;
var o = require("./92187.js");
var a = require("./24396.js");
var s = "findIndex";
var u = true;
var l = a(s);
if (s in []) {
  Array(1)[s](function () {
    u = false;
  });
}
n({
  target: "Array",
  proto: true,
  forced: u || !l
}, {
  findIndex: function (e) {
    return i(this, e, arguments.length > 1 ? arguments[1] : undefined);
  }
});
o(s);
};
