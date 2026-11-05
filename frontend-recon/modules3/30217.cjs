// webpack module 30217 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./8148.js");
var o = require("./54295.js");
var a = require("./82369.js");
var s = require("./65147.js");
var u = require("./52141.js");
var l = require("./41216.js");
var c = require("./55878.js");
var p = require("./57965.js");
var d = require("./33311.js");
var f = require("./73713.js");
var g = f.IteratorPrototype;
var m = f.BUGGY_SAFARI_ITERATORS;
var v = c("iterator");
var y = "keys";
var h = "values";
var b = "entries";
function w() {
  return this;
}
module.exports = function (e, t, r, c, f, x, E) {
  i(r, t, c);
  var k;
  var S;
  var T;
  function C(e) {
    if (e === f && P) {
      return P;
    }
    if (!m && e in O) {
      return O[e];
    }
    switch (e) {
      case y:
        return function () {
          return new r(this, e);
        };
      case h:
        return function () {
          return new r(this, e);
        };
      case b:
        return function () {
          return new r(this, e);
        };
    }
    return function () {
      return new r(this);
    };
  }
  var A = t + " Iterator";
  var _ = false;
  var O = e.prototype;
  var M = O[v] || O["@@iterator"] || f && O[f];
  var P = !m && M || C(f);
  var q = t == "Array" && O.entries || M;
  if (q) {
    k = o(q.call(new e()));
    if (g !== Object.prototype && k.next) {
      if (!p && o(k) !== g) {
        if (a) {
          a(k, g);
        } else if (typeof k[v] != "function") {
          u(k, v, w);
        }
      }
      s(k, A, true, true);
      if (p) {
        d[A] = w;
      }
    }
  }
  if (f == h && M && M.name !== h) {
    _ = true;
    P = function () {
      return M.call(this);
    };
  }
  if ((!p || !!E) && O[v] !== P) {
    u(O, v, P);
  }
  d[t] = P;
  if (f) {
    S = {
      values: C(h),
      keys: x ? P : C(y),
      entries: C(b)
    };
    if (E) {
      for (T in S) {
        if (m || _ || !(T in O)) {
          l(O, T, S[T]);
        }
      }
    } else {
      n({
        target: t,
        proto: true,
        forced: m || _
      }, S);
    }
  }
  return S;
};
};
