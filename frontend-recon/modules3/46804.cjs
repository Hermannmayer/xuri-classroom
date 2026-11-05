// webpack module 46804 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./27015.js");
var o = require("./41630.js");
var a = require("./54295.js");
var s = require("./6468.js");
var u = i(function () {
  a(1);
});
n({
  target: "Object",
  stat: true,
  forced: u,
  sham: !s
}, {
  getPrototypeOf: function (e) {
    return a(o(e));
  }
});
};
