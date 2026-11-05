// webpack module 53082 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./5659.js");
var o = require("./79456.js");
var a = require("./15595.js");
var s = require("./37987.js");
var u = require("./54295.js");
function l(e, t) {
  var r;
  var n;
  var c = arguments.length < 3 ? e : arguments[2];
  if (o(e) === c) {
    return e[t];
  } else if (r = s.f(e, t)) {
    if (a(r, "value")) {
      return r.value;
    } else if (r.get === undefined) {
      return undefined;
    } else {
      return r.get.call(c);
    }
  } else if (i(n = u(e))) {
    return l(n, t, c);
  } else {
    return undefined;
  }
}
n({
  target: "Reflect",
  stat: true
}, {
  get: l
});
};
