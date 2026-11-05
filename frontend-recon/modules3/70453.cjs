// webpack module 70453 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./79456.js");
var o = require("./54295.js");
var a = require("./6468.js");
n({
  target: "Reflect",
  stat: true,
  sham: !a
}, {
  getPrototypeOf: function (e) {
    return o(i(e));
  }
});
};
