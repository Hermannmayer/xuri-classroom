// webpack module 2660 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./92695.js");
var o = require("./55477.js");
var a = require("./15595.js");
var s = require("./5659.js");
var u = require("./75386.js").f;
var l = require("./37725.js");
var c = o.Symbol;
if (i && typeof c == "function" && (!("description" in c.prototype) || c().description !== undefined)) {
  var p = {};
  function d() {
    var e = arguments.length < 1 || arguments[0] === undefined ? undefined : String(arguments[0]);
    var t = this instanceof d ? new c(e) : e === undefined ? c() : c(e);
    if (e === "") {
      p[t] = true;
    }
    return t;
  }
  l(d, c);
  var f = d.prototype = c.prototype;
  f.constructor = d;
  var g = f.toString;
  var m = String(c("test")) == "Symbol(test)";
  var v = /^Symbol\((.*)\)[^)]+$/;
  u(f, "description", {
    configurable: true,
    get: function () {
      var e = s(this) ? this.valueOf() : this;
      var t = g.call(e);
      if (a(p, e)) {
        return "";
      }
      var r = m ? t.slice(7, -1) : t.replace(v, "$1");
      if (r === "") {
        return undefined;
      } else {
        return r;
      }
    }
  });
  n({
    global: true,
    forced: true
  }, {
    Symbol: d
  });
}
};
