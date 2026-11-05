// webpack module 1445 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./37987.js").f;
var o = require("./4484.js");
var a = require("./46979.js");
var s = require("./61230.js");
var u = require("./30268.js");
var l = require("./57965.js");
var c = "".endsWith;
var p = Math.min;
var d = u("endsWith");
var f = !l && !d && !!function () {
  var e = i(String.prototype, "endsWith");
  return e && !e.writable;
}();
n({
  target: "String",
  proto: true,
  forced: !f && !d
}, {
  endsWith: function (e) {
    var t = String(s(this));
    a(e);
    var r = arguments.length > 1 ? arguments[1] : undefined;
    var n = o(t.length);
    var i = r === undefined ? n : p(o(r), n);
    var u = String(e);
    if (c) {
      return c.call(t, u, i);
    } else {
      return t.slice(i - u.length, i) === u;
    }
  }
});
};
