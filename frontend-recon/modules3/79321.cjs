// webpack module 79321 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./60730.js");
var o = require("./41630.js");
var a = require("./27015.js");
var s = require("./43719.js");
var u = [];
var l = u.sort;
var c = a(function () {
  u.sort(undefined);
});
var p = a(function () {
  u.sort(null);
});
var d = s("sort");
var f = c || !p || !d;
n({
  target: "Array",
  proto: true,
  forced: f
}, {
  sort: function (e) {
    if (e === undefined) {
      return l.call(o(this));
    } else {
      return l.call(o(this), i(e));
    }
  }
});
};
