// webpack module 59759 — body from webcrack
module.exports = function (module, exports, require) {
(function (e) {
  if (typeof DO_NOT_EXPORT_BESSEL === "undefined") {
    e(exports);
  } else {
    e({});
  }
})(function (e) {
  e.version = "1.0.2";
  var t = Math;
  function r(e, t) {
    for (var r = 0, n = 0; r < e.length; ++r) {
      n = t * n + e[r];
    }
    return n;
  }
  function n(e, t, r, n, i) {
    if (t === 0) {
      return r;
    }
    if (t === 1) {
      return n;
    }
    var o = 2 / e;
    var a = n;
    for (var s = 1; s < t; ++s) {
      a = n * s * o + i * r;
      r = n;
      n = a;
    }
    return a;
  }
  function i(e, t, r, i, o) {
    return function (r, a) {
      if (i) {
        if (r === 0) {
          if (i == 1) {
            return -Infinity;
          } else {
            return Infinity;
          }
        }
        if (r < 0) {
          return NaN;
        }
      }
      if (a === 0) {
        return e(r);
      }
      if (a === 1) {
        return t(r);
      }
      if (a < 0) {
        return NaN;
      }
      a |= 0;
      var s = e(r);
      var u = t(r);
      return n(r, a, s, u, o);
    };
  }
  var o = function () {
    var e = 0.636619772;
    var i = [57568490574, -13362590354, 651619640.7, -11214424.18, 77392.33017, -184.9052456].reverse();
    var o = [57568490411, 1029532985, 9494680.718, 59272.64853, 267.8532712, 1].reverse();
    var a = [1, -0.001098628627, 0.00002734510407, -0.000002073370639, 2.093887211e-7].reverse();
    var s = [-0.01562499995, 0.0001430488765, -0.000006911147651, 7.621095161e-7, -9.34935152e-8].reverse();
    function u(n) {
      var u = 0;
      var l = 0;
      var c = 0;
      var p = n * n;
      if (n < 8) {
        l = r(i, p);
        c = r(o, p);
        u = l / c;
      } else {
        var d = n - 0.785398164;
        p = 64 / p;
        l = r(a, p);
        c = r(s, p);
        u = t.sqrt(e / n) * (t.cos(d) * l - t.sin(d) * c * 8 / n);
      }
      return u;
    }
    var l = [72362614232, -7895059235, 242396853.1, -2972611.439, 15704.4826, -30.16036606].reverse();
    var c = [144725228442, 2300535178, 18583304.74, 99447.43394, 376.9991397, 1].reverse();
    var p = [1, 0.00183105, -0.00003516396496, 0.000002457520174, -2.40337019e-7].reverse();
    var d = [0.04687499995, -0.0002002690873, 0.000008449199096, -8.8228987e-7, 1.05787412e-7].reverse();
    function f(n) {
      var i = 0;
      var o = 0;
      var a = 0;
      var s = n * n;
      var u = t.abs(n) - 2.356194491;
      if (Math.abs(n) < 8) {
        o = n * r(l, s);
        a = r(c, s);
        i = o / a;
      } else {
        s = 64 / s;
        o = r(p, s);
        a = r(d, s);
        i = t.sqrt(e / t.abs(n)) * (t.cos(u) * o - t.sin(u) * a * 8 / t.abs(n));
        if (n < 0) {
          i = -i;
        }
      }
      return i;
    }
    return function e(r, i) {
      i = Math.round(i);
      if (!isFinite(r)) {
        if (isNaN(r)) {
          return r;
        } else {
          return 0;
        }
      }
      if (i < 0) {
        return (i % 2 ? -1 : 1) * e(r, -i);
      }
      if (r < 0) {
        return (i % 2 ? -1 : 1) * e(-r, i);
      }
      if (i === 0) {
        return u(r);
      }
      if (i === 1) {
        return f(r);
      }
      if (r === 0) {
        return 0;
      }
      var o = 0;
      if (r > i) {
        o = n(r, i, u(r), f(r), -1);
      } else {
        var a = t.floor((i + t.floor(t.sqrt(i * 40))) / 2) * 2;
        var s = false;
        var l = 0;
        var c = 0;
        var p = 1;
        var d = 0;
        var g = 2 / r;
        for (var m = a; m > 0; m--) {
          d = m * g * p - l;
          l = p;
          p = d;
          if (t.abs(p) > 10000000000) {
            p *= 1e-10;
            l *= 1e-10;
            o *= 1e-10;
            c *= 1e-10;
          }
          if (s) {
            c += p;
          }
          s = !s;
          if (m == i) {
            o = l;
          }
        }
        c = c * 2 - p;
        o /= c;
      }
      return o;
    };
  }();
  var a = function () {
    var e = 0.636619772;
    var n = [-2957821389, 7062834065, -512359803.6, 10879881.29, -86327.92757, 228.4622733].reverse();
    var a = [40076544269, 745249964.8, 7189466.438, 47447.2647, 226.1030244, 1].reverse();
    var s = [1, -0.001098628627, 0.00002734510407, -0.000002073370639, 2.093887211e-7].reverse();
    var u = [-0.01562499995, 0.0001430488765, -0.000006911147651, 7.621095161e-7, -9.34945152e-8].reverse();
    function l(i) {
      var l = 0;
      var c = 0;
      var p = 0;
      var d = i * i;
      var f = i - 0.785398164;
      if (i < 8) {
        c = r(n, d);
        p = r(a, d);
        l = c / p + e * o(i, 0) * t.log(i);
      } else {
        d = 64 / d;
        c = r(s, d);
        p = r(u, d);
        l = t.sqrt(e / i) * (t.sin(f) * c + t.cos(f) * p * 8 / i);
      }
      return l;
    }
    var c = [-4900604943000, 1275274390000, -51534381390, 734926455.1, -4237922.726, 8511.937935].reverse();
    var p = [24995805700000, 424441966400, 3733650367, 22459040.02, 102042.605, 354.9632885, 1].reverse();
    var d = [1, 0.00183105, -0.00003516396496, 0.000002457520174, -2.40337019e-7].reverse();
    var f = [0.04687499995, -0.0002002690873, 0.000008449199096, -8.8228987e-7, 1.05787412e-7].reverse();
    function g(n) {
      var i = 0;
      var a = 0;
      var s = 0;
      var u = n * n;
      var l = n - 2.356194491;
      if (n < 8) {
        a = n * r(c, u);
        s = r(p, u);
        i = a / s + e * (o(n, 1) * t.log(n) - 1 / n);
      } else {
        u = 64 / u;
        a = r(d, u);
        s = r(f, u);
        i = t.sqrt(e / n) * (t.sin(l) * a + t.cos(l) * s * 8 / n);
      }
      return i;
    }
    return i(l, g, "BESSELY", 1, -1);
  }();
  var s = function () {
    var e = [1, 3.5156229, 3.0899424, 1.2067492, 0.2659732, 0.0360768, 0.0045813].reverse();
    var n = [0.39894228, 0.01328592, 0.00225319, -0.00157565, 0.00916281, -0.02057706, 0.02635537, -0.01647633, 0.00392377].reverse();
    function i(i) {
      if (i <= 3.75) {
        return r(e, i * i / 14.0625);
      } else {
        return t.exp(t.abs(i)) / t.sqrt(t.abs(i)) * r(n, 3.75 / t.abs(i));
      }
    }
    var o = [0.5, 0.87890594, 0.51498869, 0.15084934, 0.02658733, 0.00301532, 0.00032411].reverse();
    var a = [0.39894228, -0.03988024, -0.00362018, 0.00163801, -0.01031555, 0.02282967, -0.02895312, 0.01787654, -0.00420059].reverse();
    function s(e) {
      if (e < 3.75) {
        return e * r(o, e * e / 14.0625);
      } else {
        return (e < 0 ? -1 : 1) * t.exp(t.abs(e)) / t.sqrt(t.abs(e)) * r(a, 3.75 / t.abs(e));
      }
    }
    return function e(r, n) {
      n = Math.round(n);
      if (n === 0) {
        return i(r);
      }
      if (n === 1) {
        return s(r);
      }
      if (n < 0) {
        return NaN;
      }
      if (t.abs(r) === 0) {
        return 0;
      }
      if (r == Infinity) {
        return Infinity;
      }
      var o;
      var a = 0;
      var u = 2 / t.abs(r);
      var l = 0;
      var c = 1;
      var p = 0;
      var d = t.round((n + t.round(t.sqrt(n * 40))) / 2) * 2;
      for (o = d; o > 0; o--) {
        p = o * u * c + l;
        l = c;
        c = p;
        if (t.abs(c) > 10000000000) {
          c *= 1e-10;
          l *= 1e-10;
          a *= 1e-10;
        }
        if (o == n) {
          a = l;
        }
      }
      a *= e(r, 0) / c;
      if (r < 0 && n % 2) {
        return -a;
      } else {
        return a;
      }
    };
  }();
  var u = function () {
    var e = [-0.57721566, 0.4227842, 0.23069756, 0.0348859, 0.00262698, 0.0001075, 0.0000074].reverse();
    var n = [1.25331414, -0.07832358, 0.02189568, -0.01062446, 0.00587872, -0.0025154, 0.00053208].reverse();
    function o(i) {
      if (i <= 2) {
        return -t.log(i / 2) * s(i, 0) + r(e, i * i / 4);
      } else {
        return t.exp(-i) / t.sqrt(i) * r(n, 2 / i);
      }
    }
    var a = [1, 0.15443144, -0.67278579, -0.18156897, -0.01919402, -0.00110404, -0.00004686].reverse();
    var u = [1.25331414, 0.23498619, -0.0365562, 0.01504268, -0.00780353, 0.00325614, -0.00068245].reverse();
    function l(e) {
      if (e <= 2) {
        return t.log(e / 2) * s(e, 1) + 1 / e * r(a, e * e / 4);
      } else {
        return t.exp(-e) / t.sqrt(e) * r(u, 2 / e);
      }
    }
    return i(o, l, "BESSELK", 2, 1);
  }();
  e.besselj = o;
  e.bessely = a;
  e.besseli = s;
  e.besselk = u;
});
};
