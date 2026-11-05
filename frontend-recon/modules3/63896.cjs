// webpack module 63896 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./99252.js");
var a = require("./27015.js");
var s = require("./41497.js");
var u = require("./51052.js");
var l = require("./57159.js");
var c = require("./41216.js");
var p = !!o && a(function () {
  o.prototype.finally.call({
    then: function () {}
  }, function () {});
});
n({
  target: "Promise",
  proto: true,
  real: true,
  forced: p
}, {
  finally: function (e) {
    var t = u(this, s("Promise"));
    var r = typeof e == "function";
    return this.then(r ? function (r) {
      return l(t, e()).then(function () {
        return r;
      });
    } : e, r ? function (r) {
      return l(t, e()).then(function () {
        throw r;
      });
    } : e);
  }
});
if (!i && typeof o == "function" && !o.prototype.finally) {
  c(o.prototype, "finally", s("Promise").prototype.finally);
}
};
