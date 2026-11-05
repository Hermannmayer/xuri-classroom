// webpack module 29034 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./4484.js");
var i = require("./20108.js");
var o = require("./61230.js");
var a = Math.ceil;
function s(e) {
  return function (t, r, s) {
    var u;
    var l;
    var c = String(o(t));
    var p = c.length;
    var d = s === undefined ? " " : String(s);
    var f = n(r);
    if (f <= p || d == "") {
      return c;
    } else {
      u = f - p;
      l = i.call(d, a(u / d.length));
      if (l.length > u) {
        l = l.slice(0, u);
      }
      if (e) {
        return c + l;
      } else {
        return l + c;
      }
    }
  };
}
module.exports = {
  start: s(false),
  end: s(true)
};
};
