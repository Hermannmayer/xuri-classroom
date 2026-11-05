// webpack module 14418 — body from webcrack
module.exports = function (module, exports, require) {
var n;
var i;
var o;
var a;
var s = require("./19341.js");
var u = require("./57965.js");
var l = require("./55477.js");
var c = require("./41497.js");
var p = require("./99252.js");
var d = require("./41216.js");
var f = require("./68345.js");
var g = require("./65147.js");
var m = require("./69360.js");
var v = require("./5659.js");
var y = require("./60730.js");
var h = require("./33758.js");
var b = require("./28445.js");
var w = require("./75876.js");
var x = require("./98199.js");
var E = require("./8275.js");
var k = require("./51052.js");
var S = require("./98321.js").set;
var T = require("./45438.js");
var C = require("./57159.js");
var A = require("./93149.js");
var _ = require("./13093.js");
var O = require("./99112.js");
var M = require("./71478.js");
var P = require("./30685.js");
var q = require("./55878.js");
var N = require("./27481.js");
var R = q("species");
var I = "Promise";
var j = M.get;
var D = M.set;
var L = M.getterFor(I);
var F = p;
var Z = l.TypeError;
var z = l.document;
var U = l.process;
var B = c("fetch");
var V = _.f;
var H = V;
var W = b(U) == "process";
var Y = !!z && !!z.createEvent && !!l.dispatchEvent;
var Q = "unhandledrejection";
var $ = "rejectionhandled";
var G = 0;
var K = 1;
var J = 2;
var X = 1;
var ee = 2;
var te = P(I, function () {
  var e = w(F) !== String(F);
  if (!e) {
    if (N === 66) {
      return true;
    }
    if (!W && typeof PromiseRejectionEvent != "function") {
      return true;
    }
  }
  if (u && !F.prototype.finally) {
    return true;
  }
  if (N >= 51 && /native code/.test(F)) {
    return false;
  }
  var t = F.resolve(1);
  function r(e) {
    e(function () {}, function () {});
  }
  var n = t.constructor = {};
  n[R] = r;
  return !(t.then(function () {}) instanceof r);
});
var re = te || !E(function (e) {
  F.all(e).catch(function () {});
});
function ne(e) {
  var t;
  return !!v(e) && typeof (t = e.then) == "function" && t;
}
function ie(e, t, r) {
  if (!t.notified) {
    t.notified = true;
    var n = t.reactions;
    T(function () {
      var i = t.value;
      var o = t.state == K;
      var a = 0;
      while (n.length > a) {
        var s;
        var u;
        var l;
        var c = n[a++];
        var p = o ? c.ok : c.fail;
        var d = c.resolve;
        var f = c.reject;
        var g = c.domain;
        try {
          if (p) {
            if (!o) {
              if (t.rejection === ee) {
                ue(e, t);
              }
              t.rejection = X;
            }
            if (p === true) {
              s = i;
            } else {
              if (g) {
                g.enter();
              }
              s = p(i);
              if (g) {
                g.exit();
                l = true;
              }
            }
            if (s === c.promise) {
              f(Z("Promise-chain cycle"));
            } else if (u = ne(s)) {
              u.call(s, d, f);
            } else {
              d(s);
            }
          } else {
            f(i);
          }
        } catch (m) {
          if (g && !l) {
            g.exit();
          }
          f(m);
        }
      }
      t.reactions = [];
      t.notified = false;
      if (r && !t.rejection) {
        ae(e, t);
      }
    });
  }
}
function oe(e, t, r) {
  var n;
  var i;
  if (Y) {
    n = z.createEvent("Event");
    n.promise = t;
    n.reason = r;
    n.initEvent(e, false, true);
    l.dispatchEvent(n);
  } else {
    n = {
      promise: t,
      reason: r
    };
  }
  if (i = l["on" + e]) {
    i(n);
  } else if (e === Q) {
    A("Unhandled promise rejection", r);
  }
}
function ae(e, t) {
  S.call(l, function () {
    var r;
    var n = t.value;
    var i = se(t);
    if (i && (r = O(function () {
      if (W) {
        U.emit("unhandledRejection", n, e);
      } else {
        oe(Q, e, n);
      }
    }), t.rejection = W || se(t) ? ee : X, r.error)) {
      throw r.value;
    }
  });
}
function se(e) {
  return e.rejection !== X && !e.parent;
}
function ue(e, t) {
  S.call(l, function () {
    if (W) {
      U.emit("rejectionHandled", e);
    } else {
      oe($, e, t.value);
    }
  });
}
function le(e, t, r, n) {
  return function (i) {
    e(t, r, i, n);
  };
}
function ce(e, t, r, n) {
  if (!t.done) {
    t.done = true;
    if (n) {
      t = n;
    }
    t.value = r;
    t.state = J;
    ie(e, t, true);
  }
}
function pe(e, t, r, n) {
  if (!t.done) {
    t.done = true;
    if (n) {
      t = n;
    }
    try {
      if (e === r) {
        throw Z("Promise can't be resolved itself");
      }
      var i = ne(r);
      if (i) {
        T(function () {
          var n = {
            done: false
          };
          try {
            i.call(r, le(pe, e, n, t), le(ce, e, n, t));
          } catch (o) {
            ce(e, n, o, t);
          }
        });
      } else {
        t.value = r;
        t.state = K;
        ie(e, t, false);
      }
    } catch (o) {
      ce(e, {
        done: false
      }, o, t);
    }
  }
}
if (te) {
  F = function (e) {
    h(this, F, I);
    y(e);
    n.call(this);
    var t = j(this);
    try {
      e(le(pe, this, t), le(ce, this, t));
    } catch (r) {
      ce(this, t, r);
    }
  };
  n = function (e) {
    D(this, {
      type: I,
      done: false,
      notified: false,
      parent: false,
      reactions: [],
      rejection: false,
      state: G,
      value: undefined
    });
  };
  n.prototype = f(F.prototype, {
    then: function (e, t) {
      var r = L(this);
      var n = V(k(this, F));
      n.ok = typeof e != "function" || e;
      n.fail = typeof t == "function" && t;
      n.domain = W ? U.domain : undefined;
      r.parent = true;
      r.reactions.push(n);
      if (r.state != G) {
        ie(this, r, false);
      }
      return n.promise;
    },
    catch: function (e) {
      return this.then(undefined, e);
    }
  });
  i = function () {
    var e = new n();
    var t = j(e);
    this.promise = e;
    this.resolve = le(pe, e, t);
    this.reject = le(ce, e, t);
  };
  _.f = V = function (e) {
    if (e === F || e === o) {
      return new i(e);
    } else {
      return H(e);
    }
  };
  if (!u && typeof p == "function") {
    a = p.prototype.then;
    d(p.prototype, "then", function (e, t) {
      var r = this;
      return new F(function (e, t) {
        a.call(r, e, t);
      }).then(e, t);
    }, {
      unsafe: true
    });
    if (typeof B == "function") {
      s({
        global: true,
        enumerable: true,
        forced: true
      }, {
        fetch: function (e) {
          return C(F, B.apply(l, arguments));
        }
      });
    }
  }
}
s({
  global: true,
  wrap: true,
  forced: te
}, {
  Promise: F
});
g(F, I, false, true);
m(I);
o = c(I);
s({
  target: I,
  stat: true,
  forced: te
}, {
  reject: function (e) {
    var t = V(this);
    t.reject.call(undefined, e);
    return t.promise;
  }
});
s({
  target: I,
  stat: true,
  forced: u || te
}, {
  resolve: function (e) {
    return C(u && this === o ? F : this, e);
  }
});
s({
  target: I,
  stat: true,
  forced: re
}, {
  all: function (e) {
    var t = this;
    var r = V(t);
    var n = r.resolve;
    var i = r.reject;
    var o = O(function () {
      var r = y(t.resolve);
      var o = [];
      var a = 0;
      var s = 1;
      x(e, function (e) {
        var u = a++;
        var l = false;
        o.push(undefined);
        s++;
        r.call(t, e).then(function (e) {
          if (!l) {
            l = true;
            o[u] = e;
            if (! --s) {
              n(o);
            }
          }
        }, i);
      });
      if (! --s) {
        n(o);
      }
    });
    if (o.error) {
      i(o.value);
    }
    return r.promise;
  },
  race: function (e) {
    var t = this;
    var r = V(t);
    var n = r.reject;
    var i = O(function () {
      var i = y(t.resolve);
      x(e, function (e) {
        i.call(t, e).then(r.resolve, n);
      });
    });
    if (i.error) {
      n(i.value);
    }
    return r.promise;
  }
});
};
