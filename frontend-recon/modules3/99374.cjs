// webpack module 99374 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./55477.js");
var o = require("./41497.js");
var a = require("./57965.js");
var s = require("./92695.js");
var u = require("./71892.js");
var l = require("./20563.js");
var c = require("./27015.js");
var p = require("./15595.js");
var d = require("./49674.js");
var f = require("./5659.js");
var g = require("./79456.js");
var m = require("./41630.js");
var v = require("./66845.js");
var y = require("./45867.js");
var h = require("./26244.js");
var b = require("./18203.js");
var w = require("./81504.js");
var x = require("./2381.js");
var E = require("./63133.js");
var k = require("./15614.js");
var S = require("./37987.js");
var T = require("./75386.js");
var C = require("./22674.js");
var A = require("./52141.js");
var _ = require("./41216.js");
var O = require("./89281.js");
var M = require("./58098.js");
var P = require("./22365.js");
var q = require("./22319.js");
var N = require("./55878.js");
var R = require("./38582.js");
var I = require("./9684.js");
var j = require("./65147.js");
var D = require("./71478.js");
var L = require("./19706.js").forEach;
var F = M("hidden");
var Z = "Symbol";
var z = "prototype";
var U = N("toPrimitive");
var B = D.set;
var V = D.getterFor(Z);
var H = Object[z];
var W = i.Symbol;
var Y = o("JSON", "stringify");
var Q = S.f;
var $ = T.f;
var G = E.f;
var K = C.f;
var J = O("symbols");
var X = O("op-symbols");
var ee = O("string-to-symbol-registry");
var te = O("symbol-to-string-registry");
var re = O("wks");
var ne = i.QObject;
var ie = !ne || !ne[z] || !ne[z].findChild;
var oe = s && c(function () {
  return b($({}, "a", {
    get: function () {
      return $(this, "a", {
        value: 7
      }).a;
    }
  })).a != 7;
}) ? function (e, t, r) {
  var n = Q(H, t);
  if (n) {
    delete H[t];
  }
  $(e, t, r);
  if (n && e !== H) {
    $(H, t, n);
  }
} : $;
function ae(e, t) {
  var r = J[e] = b(W[z]);
  B(r, {
    type: Z,
    tag: e,
    description: t
  });
  if (!s) {
    r.description = t;
  }
  return r;
}
var se = l ? function (e) {
  return typeof e == "symbol";
} : function (e) {
  return Object(e) instanceof W;
};
function ue(e, t, r) {
  if (e === H) {
    ue(X, t, r);
  }
  g(e);
  var n = y(t, true);
  g(r);
  if (p(J, n)) {
    if (r.enumerable) {
      if (p(e, F) && e[F][n]) {
        e[F][n] = false;
      }
      r = b(r, {
        enumerable: h(0, false)
      });
    } else {
      if (!p(e, F)) {
        $(e, F, h(1, {}));
      }
      e[F][n] = true;
    }
    return oe(e, n, r);
  } else {
    return $(e, n, r);
  }
}
function le(e, t) {
  g(e);
  var r = v(t);
  var n = w(r).concat(ge(r));
  L(n, function (t) {
    if (!s || !!pe.call(r, t)) {
      ue(e, t, r[t]);
    }
  });
  return e;
}
function ce(e, t) {
  if (t === undefined) {
    return b(e);
  } else {
    return le(b(e), t);
  }
}
function pe(e) {
  var t = y(e, true);
  var r = K.call(this, t);
  return (this !== H || !p(J, t) || !!p(X, t)) && (!r && !!p(this, t) && !!p(J, t) && (!p(this, F) || !this[F][t]) || r);
}
function de(e, t) {
  var r = v(e);
  var n = y(t, true);
  if (r !== H || !p(J, n) || p(X, n)) {
    var i = Q(r, n);
    if (!!i && !!p(J, n) && (!p(r, F) || !r[F][n])) {
      i.enumerable = true;
    }
    return i;
  }
}
function fe(e) {
  var t = G(v(e));
  var r = [];
  L(t, function (e) {
    if (!p(J, e) && !p(P, e)) {
      r.push(e);
    }
  });
  return r;
}
function ge(e) {
  var t = e === H;
  var r = G(t ? X : v(e));
  var n = [];
  L(r, function (e) {
    if (!!p(J, e) && (!t || !!p(H, e))) {
      n.push(J[e]);
    }
  });
  return n;
}
if (!u) {
  W = function () {
    if (this instanceof W) {
      throw TypeError("Symbol is not a constructor");
    }
    var e = arguments.length && arguments[0] !== undefined ? String(arguments[0]) : undefined;
    var t = q(e);
    function r(e) {
      if (this === H) {
        r.call(X, e);
      }
      if (p(this, F) && p(this[F], t)) {
        this[F][t] = false;
      }
      oe(this, t, h(1, e));
    }
    if (s && ie) {
      oe(H, t, {
        configurable: true,
        set: r
      });
    }
    return ae(t, e);
  };
  _(W[z], "toString", function () {
    return V(this).tag;
  });
  _(W, "withoutSetter", function (e) {
    return ae(q(e), e);
  });
  C.f = pe;
  T.f = ue;
  S.f = de;
  x.f = E.f = fe;
  k.f = ge;
  R.f = function (e) {
    return ae(N(e), e);
  };
  if (s) {
    $(W[z], "description", {
      configurable: true,
      get: function () {
        return V(this).description;
      }
    });
    if (!a) {
      _(H, "propertyIsEnumerable", pe, {
        unsafe: true
      });
    }
  }
}
n({
  global: true,
  wrap: true,
  forced: !u,
  sham: !u
}, {
  Symbol: W
});
L(w(re), function (e) {
  I(e);
});
n({
  target: Z,
  stat: true,
  forced: !u
}, {
  for: function (e) {
    var t = String(e);
    if (p(ee, t)) {
      return ee[t];
    }
    var r = W(t);
    ee[t] = r;
    te[r] = t;
    return r;
  },
  keyFor: function (e) {
    if (!se(e)) {
      throw TypeError(e + " is not a symbol");
    }
    if (p(te, e)) {
      return te[e];
    }
  },
  useSetter: function () {
    ie = true;
  },
  useSimple: function () {
    ie = false;
  }
});
n({
  target: "Object",
  stat: true,
  forced: !u,
  sham: !s
}, {
  create: ce,
  defineProperty: ue,
  defineProperties: le,
  getOwnPropertyDescriptor: de
});
n({
  target: "Object",
  stat: true,
  forced: !u
}, {
  getOwnPropertyNames: fe,
  getOwnPropertySymbols: ge
});
n({
  target: "Object",
  stat: true,
  forced: c(function () {
    k.f(1);
  })
}, {
  getOwnPropertySymbols: function (e) {
    return k.f(m(e));
  }
});
if (Y) {
  var me = !u || c(function () {
    var e = W();
    return Y([e]) != "[null]" || Y({
      a: e
    }) != "{}" || Y(Object(e)) != "{}";
  });
  n({
    target: "JSON",
    stat: true,
    forced: me
  }, {
    stringify: function (e, t, r) {
      var n;
      var i = [e];
      var o = 1;
      while (arguments.length > o) {
        i.push(arguments[o++]);
      }
      n = t;
      if ((f(t) || e !== undefined) && !se(e)) {
        if (!d(t)) {
          t = function (e, t) {
            if (typeof n == "function") {
              t = n.call(this, e, t);
            }
            if (!se(t)) {
              return t;
            }
          };
        }
        i[1] = t;
        return Y.apply(null, i);
      }
    }
  });
}
if (!W[z][U]) {
  A(W[z], U, W[z].valueOf);
}
j(W, Z);
P[F] = true;
};
