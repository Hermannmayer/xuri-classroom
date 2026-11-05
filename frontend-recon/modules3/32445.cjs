// webpack module 32445 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./75386.js").f;
var i = require("./18203.js");
var o = require("./68345.js");
var a = require("./52485.js");
var s = require("./33758.js");
var u = require("./98199.js");
var l = require("./30217.js");
var c = require("./69360.js");
var p = require("./92695.js");
var d = require("./74804.js").fastKey;
var f = require("./71478.js");
var g = f.set;
var m = f.getterFor;
module.exports = {
  getConstructor: function (e, t, r, l) {
    var c = e(function (e, n) {
      s(e, c, t);
      g(e, {
        type: t,
        index: i(null),
        first: undefined,
        last: undefined,
        size: 0
      });
      if (!p) {
        e.size = 0;
      }
      if (n != undefined) {
        u(n, e[l], e, r);
      }
    });
    var f = m(t);
    function v(e, t, r) {
      var n;
      var i;
      var o = f(e);
      var a = y(e, t);
      if (a) {
        a.value = r;
      } else {
        o.last = a = {
          index: i = d(t, true),
          key: t,
          value: r,
          previous: n = o.last,
          next: undefined,
          removed: false
        };
        o.first ||= a;
        if (n) {
          n.next = a;
        }
        if (p) {
          o.size++;
        } else {
          e.size++;
        }
        if (i !== "F") {
          o.index[i] = a;
        }
      }
      return e;
    }
    function y(e, t) {
      var r;
      var n = f(e);
      var i = d(t);
      if (i !== "F") {
        return n.index[i];
      }
      for (r = n.first; r; r = r.next) {
        if (r.key == t) {
          return r;
        }
      }
    }
    o(c.prototype, {
      clear: function () {
        var e = this;
        var t = f(e);
        var r = t.index;
        var n = t.first;
        while (n) {
          n.removed = true;
          n.previous &&= n.previous.next = undefined;
          delete r[n.index];
          n = n.next;
        }
        t.first = t.last = undefined;
        if (p) {
          t.size = 0;
        } else {
          e.size = 0;
        }
      },
      delete: function (e) {
        var t = this;
        var r = f(t);
        var n = y(t, e);
        if (n) {
          var i = n.next;
          var o = n.previous;
          delete r.index[n.index];
          n.removed = true;
          if (o) {
            o.next = i;
          }
          if (i) {
            i.previous = o;
          }
          if (r.first == n) {
            r.first = i;
          }
          if (r.last == n) {
            r.last = o;
          }
          if (p) {
            r.size--;
          } else {
            t.size--;
          }
        }
        return !!n;
      },
      forEach: function (e) {
        var t;
        var r = f(this);
        var n = a(e, arguments.length > 1 ? arguments[1] : undefined, 3);
        while (t = t ? t.next : r.first) {
          n(t.value, t.key, this);
          while (t && t.removed) {
            t = t.previous;
          }
        }
      },
      has: function (e) {
        return !!y(this, e);
      }
    });
    o(c.prototype, r ? {
      get: function (e) {
        var t = y(this, e);
        return t && t.value;
      },
      set: function (e, t) {
        return v(this, e === 0 ? 0 : e, t);
      }
    } : {
      add: function (e) {
        return v(this, e = e === 0 ? 0 : e, e);
      }
    });
    if (p) {
      n(c.prototype, "size", {
        get: function () {
          return f(this).size;
        }
      });
    }
    return c;
  },
  setStrong: function (e, t, r) {
    var n = t + " Iterator";
    var i = m(t);
    var o = m(n);
    l(e, t, function (e, t) {
      g(this, {
        type: n,
        target: e,
        state: i(e),
        kind: t,
        last: undefined
      });
    }, function () {
      var e = o(this);
      var t = e.kind;
      var r = e.last;
      while (r && r.removed) {
        r = r.previous;
      }
      if (e.target && (e.last = r = r ? r.next : e.state.first)) {
        if (t == "keys") {
          return {
            value: r.key,
            done: false
          };
        } else if (t == "values") {
          return {
            value: r.value,
            done: false
          };
        } else {
          return {
            value: [r.key, r.value],
            done: false
          };
        }
      } else {
        e.target = undefined;
        return {
          value: undefined,
          done: true
        };
      }
    }, r ? "entries" : "values", !r, true);
    c(t);
  }
};
};
