// webpack module 59127 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./78426.js");
var o = require("./43332.js");
var a = require("./20108.js");
var s = require("./27015.js");
var u = 1 .toFixed;
var l = Math.floor;
function c(e, t, r) {
  if (t === 0) {
    return r;
  } else if (t % 2 === 1) {
    return c(e, t - 1, r * e);
  } else {
    return c(e * e, t / 2, r);
  }
}
function p(e) {
  var t = 0;
  var r = e;
  while (r >= 4096) {
    t += 12;
    r /= 4096;
  }
  while (r >= 2) {
    t += 1;
    r /= 2;
  }
  return t;
}
var d = u && (0.00008.toFixed(3) !== "0.000" || 0.9.toFixed(0) !== "1" || 1.255.toFixed(2) !== "1.25" || 1000000000000000100 .toFixed(0) !== "1000000000000000128") || !s(function () {
  u.call({});
});
n({
  target: "Number",
  proto: true,
  forced: d
}, {
  toFixed: function (e) {
    var t;
    var r;
    var n;
    var s;
    var u = o(this);
    var d = i(e);
    var f = [0, 0, 0, 0, 0, 0];
    var g = "";
    var m = "0";
    function v(e, t) {
      var r = -1;
      var n = t;
      while (++r < 6) {
        n += e * f[r];
        f[r] = n % 10000000;
        n = l(n / 10000000);
      }
    }
    function y(e) {
      var t = 6;
      var r = 0;
      while (--t >= 0) {
        r += f[t];
        f[t] = l(r / e);
        r = r % e * 10000000;
      }
    }
    function h() {
      var e = 6;
      var t = "";
      while (--e >= 0) {
        if (t !== "" || e === 0 || f[e] !== 0) {
          var r = String(f[e]);
          t = t === "" ? r : t + a.call("0", 7 - r.length) + r;
        }
      }
      return t;
    }
    if (d < 0 || d > 20) {
      throw RangeError("Incorrect fraction digits");
    }
    if (u != u) {
      return "NaN";
    }
    if (u <= -1e+21 || u >= 1e+21) {
      return String(u);
    }
    if (u < 0) {
      g = "-";
      u = -u;
    }
    if (u > 1e-21) {
      t = p(u * c(2, 69, 1)) - 69;
      r = t < 0 ? u * c(2, -t, 1) : u / c(2, t, 1);
      r *= 4503599627370496;
      t = 52 - t;
      if (t > 0) {
        v(0, r);
        n = d;
        while (n >= 7) {
          v(10000000, 0);
          n -= 7;
        }
        v(c(10, n, 1), 0);
        n = t - 1;
        while (n >= 23) {
          y(8388608);
          n -= 23;
        }
        y(1 << n);
        v(1, 1);
        y(2);
        m = h();
      } else {
        v(0, r);
        v(1 << -t, 0);
        m = h() + a.call("0", d);
      }
    }
    if (d > 0) {
      s = m.length;
      m = g + (s <= d ? "0." + a.call("0", d - s) + m : m.slice(0, s - d) + "." + m.slice(s - d));
    } else {
      m = g + m;
    }
    return m;
  }
});
};
