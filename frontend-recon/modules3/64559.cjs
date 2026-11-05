// webpack module 64559 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./92695.js");
var o = require("./79456.js");
var a = require("./37987.js");
n({
  target: "Reflect",
  stat: true,
  sham: !i
}, {
  getOwnPropertyDescriptor: function (e, t) {
    return a.f(o(e), t);
  }
});
};
