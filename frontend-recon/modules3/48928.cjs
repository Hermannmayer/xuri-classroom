// webpack module 48928 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./27015.js");
var o = require("./66845.js");
var a = require("./37987.js").f;
var s = require("./92695.js");
var u = i(function () {
  a(1);
});
var l = !s || u;
n({
  target: "Object",
  stat: true,
  forced: l,
  sham: !s
}, {
  getOwnPropertyDescriptor: function (e, t) {
    return a(o(e), t);
  }
});
};
