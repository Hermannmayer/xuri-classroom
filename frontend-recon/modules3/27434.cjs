// webpack module 27434 — body from webcrack
module.exports = function (module, exports, require) {
var n;
var i = require("./55477.js");
var o = require("./68345.js");
var a = require("./74804.js");
var s = require("./54996.js");
var u = require("./56802.js");
var l = require("./5659.js");
var c = require("./71478.js").enforce;
var p = require("./86042.js");
var d = !i.ActiveXObject && "ActiveXObject" in i;
var f = Object.isExtensible;
function g(e) {
  return function () {
    return e(this, arguments.length ? arguments[0] : undefined);
  };
}
var m = module.exports = s("WeakMap", g, u);
if (p && d) {
  n = u.getConstructor(g, "WeakMap", true);
  a.REQUIRED = true;
  var v = m.prototype;
  var y = v.delete;
  var h = v.has;
  var b = v.get;
  var w = v.set;
  o(v, {
    delete: function (e) {
      if (l(e) && !f(e)) {
        var t = c(this);
        t.frozen ||= new n();
        return y.call(this, e) || t.frozen.delete(e);
      }
      return y.call(this, e);
    },
    has: function (e) {
      if (l(e) && !f(e)) {
        var t = c(this);
        t.frozen ||= new n();
        return h.call(this, e) || t.frozen.has(e);
      }
      return h.call(this, e);
    },
    get: function (e) {
      if (l(e) && !f(e)) {
        var t = c(this);
        t.frozen ||= new n();
        if (h.call(this, e)) {
          return b.call(this, e);
        } else {
          return t.frozen.get(e);
        }
      }
      return b.call(this, e);
    },
    set: function (e, t) {
      if (l(e) && !f(e)) {
        var r = c(this);
        r.frozen ||= new n();
        if (h.call(this, e)) {
          w.call(this, e, t);
        } else {
          r.frozen.set(e, t);
        }
      } else {
        w.call(this, e, t);
      }
      return this;
    }
  });
}
};
