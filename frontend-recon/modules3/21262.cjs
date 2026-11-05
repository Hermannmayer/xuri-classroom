// webpack module 21262 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./61230.js");
var o = require("./86930.js");
var a = require("./57300.js");
var s = require("./55878.js");
var u = require("./57965.js");
var l = s("replace");
var c = RegExp.prototype;
n({
  target: "String",
  proto: true
}, {
  replaceAll: function e(t, r) {
    var n;
    var s;
    var p;
    var d;
    var f;
    var g;
    var m;
    var v;
    var y;
    var h = i(this);
    if (t != null) {
      n = o(t);
      if (n && (s = String(i("flags" in c ? t.flags : a.call(t))), !~s.indexOf("g"))) {
        throw TypeError("`.replaceAll` does not allow non-global regexes");
      }
      p = t[l];
      if (p !== undefined) {
        return p.call(t, h, r);
      }
      if (u && n) {
        return String(h).replace(t, r);
      }
    }
    d = String(h);
    f = String(t);
    if (f === "") {
      return e.call(d, /(?:)/g, r);
    }
    g = d.split(f);
    if (typeof r !== "function") {
      return g.join(String(r));
    }
    m = g[0];
    v = m.length;
    y = 1;
    for (; y < g.length; y++) {
      m += String(r(f, v, d));
      v += f.length + g[y].length;
      m += g[y];
    }
    return m;
  }
});
};
