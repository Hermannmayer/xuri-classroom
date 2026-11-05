// webpack module 67702 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = require("./92695.js");
var o = require("./8733.js");
var a = require("./52141.js");
var s = require("./68345.js");
var u = require("./27015.js");
var l = require("./33758.js");
var c = require("./78426.js");
var p = require("./4484.js");
var d = require("./55377.js");
var f = require("./66329.js");
var g = require("./54295.js");
var m = require("./82369.js");
var v = require("./2381.js").f;
var y = require("./75386.js").f;
var h = require("./16858.js");
var b = require("./65147.js");
var w = require("./71478.js");
var x = w.get;
var E = w.set;
var k = "ArrayBuffer";
var S = "DataView";
var T = "prototype";
var C = "Wrong length";
var A = "Wrong index";
var _ = n[k];
var O = _;
var M = n[S];
var P = M && M[T];
var q = Object.prototype;
var N = n.RangeError;
var R = f.pack;
var I = f.unpack;
function j(e) {
  return [e & 255];
}
function D(e) {
  return [e & 255, e >> 8 & 255];
}
function L(e) {
  return [e & 255, e >> 8 & 255, e >> 16 & 255, e >> 24 & 255];
}
function F(e) {
  return e[3] << 24 | e[2] << 16 | e[1] << 8 | e[0];
}
function Z(e) {
  return R(e, 23, 4);
}
function z(e) {
  return R(e, 52, 8);
}
function U(e, t) {
  y(e[T], t, {
    get: function () {
      return x(this)[t];
    }
  });
}
function B(e, t, r, n) {
  var i = d(r);
  var o = x(e);
  if (i + t > o.byteLength) {
    throw N(A);
  }
  var a = x(o.buffer).bytes;
  var s = i + o.byteOffset;
  var u = a.slice(s, s + t);
  if (n) {
    return u;
  } else {
    return u.reverse();
  }
}
function V(e, t, r, n, i, o) {
  var a = d(r);
  var s = x(e);
  if (a + t > s.byteLength) {
    throw N(A);
  }
  var u = x(s.buffer).bytes;
  var l = a + s.byteOffset;
  var c = n(+i);
  for (var p = 0; p < t; p++) {
    u[l + p] = c[o ? p : t - p - 1];
  }
}
if (o) {
  if (!u(function () {
    _(1);
  }) || !u(function () {
    new _(-1);
  }) || u(function () {
    new _();
    new _(1.5);
    new _(NaN);
    return _.name != k;
  })) {
    O = function (e) {
      l(this, O);
      return new _(d(e));
    };
    var H;
    var W = O[T] = _[T];
    for (var Y = v(_), Q = 0; Y.length > Q;) {
      if (!((H = Y[Q++]) in O)) {
        a(O, H, _[H]);
      }
    }
    W.constructor = O;
  }
  if (m && g(P) !== q) {
    m(P, q);
  }
  var $ = new M(new O(2));
  var G = P.setInt8;
  $.setInt8(0, 2147483648);
  $.setInt8(1, 2147483649);
  if (!!$.getInt8(0) || !$.getInt8(1)) {
    s(P, {
      setInt8: function (e, t) {
        G.call(this, e, t << 24 >> 24);
      },
      setUint8: function (e, t) {
        G.call(this, e, t << 24 >> 24);
      }
    }, {
      unsafe: true
    });
  }
} else {
  O = function (e) {
    l(this, O, k);
    var t = d(e);
    E(this, {
      bytes: h.call(new Array(t), 0),
      byteLength: t
    });
    if (!i) {
      this.byteLength = t;
    }
  };
  M = function (e, t, r) {
    l(this, M, S);
    l(e, O, S);
    var n = x(e).byteLength;
    var o = c(t);
    if (o < 0 || o > n) {
      throw N("Wrong offset");
    }
    r = r === undefined ? n - o : p(r);
    if (o + r > n) {
      throw N(C);
    }
    E(this, {
      buffer: e,
      byteLength: r,
      byteOffset: o
    });
    if (!i) {
      this.buffer = e;
      this.byteLength = r;
      this.byteOffset = o;
    }
  };
  if (i) {
    U(O, "byteLength");
    U(M, "buffer");
    U(M, "byteLength");
    U(M, "byteOffset");
  }
  s(M[T], {
    getInt8: function (e) {
      return B(this, 1, e)[0] << 24 >> 24;
    },
    getUint8: function (e) {
      return B(this, 1, e)[0];
    },
    getInt16: function (e) {
      var t = B(this, 2, e, arguments.length > 1 ? arguments[1] : undefined);
      return (t[1] << 8 | t[0]) << 16 >> 16;
    },
    getUint16: function (e) {
      var t = B(this, 2, e, arguments.length > 1 ? arguments[1] : undefined);
      return t[1] << 8 | t[0];
    },
    getInt32: function (e) {
      return F(B(this, 4, e, arguments.length > 1 ? arguments[1] : undefined));
    },
    getUint32: function (e) {
      return F(B(this, 4, e, arguments.length > 1 ? arguments[1] : undefined)) >>> 0;
    },
    getFloat32: function (e) {
      return I(B(this, 4, e, arguments.length > 1 ? arguments[1] : undefined), 23);
    },
    getFloat64: function (e) {
      return I(B(this, 8, e, arguments.length > 1 ? arguments[1] : undefined), 52);
    },
    setInt8: function (e, t) {
      V(this, 1, e, j, t);
    },
    setUint8: function (e, t) {
      V(this, 1, e, j, t);
    },
    setInt16: function (e, t) {
      V(this, 2, e, D, t, arguments.length > 2 ? arguments[2] : undefined);
    },
    setUint16: function (e, t) {
      V(this, 2, e, D, t, arguments.length > 2 ? arguments[2] : undefined);
    },
    setInt32: function (e, t) {
      V(this, 4, e, L, t, arguments.length > 2 ? arguments[2] : undefined);
    },
    setUint32: function (e, t) {
      V(this, 4, e, L, t, arguments.length > 2 ? arguments[2] : undefined);
    },
    setFloat32: function (e, t) {
      V(this, 4, e, Z, t, arguments.length > 2 ? arguments[2] : undefined);
    },
    setFloat64: function (e, t) {
      V(this, 8, e, z, t, arguments.length > 2 ? arguments[2] : undefined);
    }
  });
}
b(O, k);
b(M, S);
module.exports = {
  ArrayBuffer: O,
  DataView: M
};
};
