// webpack module 24396 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./92695.js");
var i = require("./27015.js");
var o = require("./15595.js");
var a = Object.defineProperty;
var s = {};
function u(e) {
  throw e;
}
module.exports = function (e, t) {
  if (o(s, e)) {
    return s[e];
  }
  t ||= {};
  var r = [][e];
  var l = !!o(t, "ACCESSORS") && t.ACCESSORS;
  var c = o(t, 0) ? t[0] : u;
  var p = o(t, 1) ? t[1] : undefined;
  return s[e] = !!r && !i(function () {
    if (l && !n) {
      return true;
    }
    var e = {
      length: -1
    };
    if (l) {
      a(e, 1, {
        enumerable: true,
        get: u
      });
    } else {
      e[1] = 1;
    }
    r.call(e, c, p);
  });
};
};
