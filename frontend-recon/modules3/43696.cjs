// webpack module 43696 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./61606.js");
var i = require("./89460.js");
var o = require("./88046.js");
var a = NaN;
var s = /^[-+]0x[0-9a-f]+$/i;
var u = /^0b[01]+$/i;
var l = /^0o[0-7]+$/i;
var c = parseInt;
function p(e) {
  if (typeof e == "number") {
    return e;
  }
  if (o(e)) {
    return a;
  }
  if (i(e)) {
    var t = typeof e.valueOf == "function" ? e.valueOf() : e;
    e = i(t) ? t + "" : t;
  }
  if (typeof e != "string") {
    if (e === 0) {
      return e;
    } else {
      return +e;
    }
  }
  e = n(e);
  var r = u.test(e);
  if (r || l.test(e)) {
    return c(e.slice(2), r ? 2 : 8);
  } else if (s.test(e)) {
    return a;
  } else {
    return +e;
  }
}
module.exports = p;
};
