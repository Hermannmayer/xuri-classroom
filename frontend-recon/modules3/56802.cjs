// webpack module 56802 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./68345.js");
var i = require("./74804.js").getWeakData;
var o = require("./79456.js");
var a = require("./5659.js");
var s = require("./33758.js");
var u = require("./98199.js");
var l = require("./19706.js");
var c = require("./15595.js");
var p = require("./71478.js");
var d = p.set;
var f = p.getterFor;
var g = l.find;
var m = l.findIndex;
var v = 0;
function y(e) {
  return e.frozen ||= new h();
}
function h() {
  this.entries = [];
}
function b(e, t) {
  return g(e.entries, function (e) {
    return e[0] === t;
  });
}
h.prototype = {
  get: function (e) {
    var t = b(this, e);
    if (t) {
      return t[1];
    }
  },
  has: function (e) {
    return !!b(this, e);
  },
  set: function (e, t) {
    var r = b(this, e);
    if (r) {
      r[1] = t;
    } else {
      this.entries.push([e, t]);
    }
  },
  delete: function (e) {
    var t = m(this.entries, function (t) {
      return t[0] === e;
    });
    if (~t) {
      this.entries.splice(t, 1);
    }
    return !!~t;
  }
};
module.exports = {
  getConstructor: function (e, t, r, l) {
    var p = e(function (e, n) {
      s(e, p, t);
      d(e, {
        type: t,
        id: v++,
        frozen: undefined
      });
      if (n != undefined) {
        u(n, e[l], e, r);
      }
    });
    var g = f(t);
    function m(e, t, r) {
      var n = g(e);
      var a = i(o(t), true);
      if (a === true) {
        y(n).set(t, r);
      } else {
        a[n.id] = r;
      }
      return e;
    }
    n(p.prototype, {
      delete: function (e) {
        var t = g(this);
        if (!a(e)) {
          return false;
        }
        var r = i(e);
        if (r === true) {
          return y(t).delete(e);
        } else {
          return r && c(r, t.id) && delete r[t.id];
        }
      },
      has: function (e) {
        var t = g(this);
        if (!a(e)) {
          return false;
        }
        var r = i(e);
        if (r === true) {
          return y(t).has(e);
        } else {
          return r && c(r, t.id);
        }
      }
    });
    n(p.prototype, r ? {
      get: function (e) {
        var t = g(this);
        if (a(e)) {
          var r = i(e);
          if (r === true) {
            return y(t).get(e);
          } else if (r) {
            return r[t.id];
          } else {
            return undefined;
          }
        }
      },
      set: function (e, t) {
        return m(this, e, t);
      }
    } : {
      add: function (e) {
        return m(this, e, true);
      }
    });
    return p;
  }
};
};
