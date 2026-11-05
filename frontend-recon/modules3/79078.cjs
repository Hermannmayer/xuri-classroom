// webpack module 79078 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./79456.js");
var o = require("./5659.js");
var a = require("./15595.js");
var s = require("./27015.js");
var u = require("./75386.js");
var l = require("./37987.js");
var c = require("./54295.js");
var p = require("./26244.js");
function d(e, t, r) {
  var n;
  var s;
  var f = arguments.length < 4 ? e : arguments[3];
  var g = l.f(i(e), t);
  if (!g) {
    if (o(s = c(e))) {
      return d(s, t, r, f);
    }
    g = p(0);
  }
  if (a(g, "value")) {
    if (g.writable === false || !o(f)) {
      return false;
    }
    if (n = l.f(f, t)) {
      if (n.get || n.set || n.writable === false) {
        return false;
      }
      n.value = r;
      u.f(f, t, n);
    } else {
      u.f(f, t, p(0, r));
    }
    return true;
  }
  return g.set !== undefined && (g.set.call(f, r), true);
}
var f = s(function () {
  var e = u.f({}, "a", {
    configurable: true
  });
  return Reflect.set(c(e), "a", 1, e) !== false;
});
n({
  target: "Reflect",
  stat: true,
  forced: f
}, {
  set: d
});
};
