// webpack module 84232 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./37987.js").f;
var o = require("./4484.js");
var a = require("./46979.js");
var s = require("./61230.js");
var u = require("./30268.js");
var l = require("./57965.js");
var c = "".startsWith;
var p = Math.min;
var d = u("startsWith");
var f = !l && !d && !!function () {
  var e = i(String.prototype, "startsWith");
  return e && !e.writable;
}();
n({
  target: "String",
  proto: true,
  forced: !f && !d
}, {
  startsWith: function (e) {
    var t = String(s(this));
    a(e);
    var r = o(p(arguments.length > 1 ? arguments[1] : undefined, t.length));
    var n = String(e);
    if (c) {
      return c.call(t, n, r);
    } else {
      return t.slice(r, r + n.length) === n;
    }
  }
});
};
