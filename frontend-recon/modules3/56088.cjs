// webpack module 56088 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  blue: function () {
    return P;
  },
  cyan: function () {
    return M;
  },
  geekblue: function () {
    return q;
  },
  generate: function () {
    return b;
  },
  gold: function () {
    return T;
  },
  green: function () {
    return O;
  },
  grey: function () {
    return I;
  },
  lime: function () {
    return _;
  },
  magenta: function () {
    return R;
  },
  orange: function () {
    return C;
  },
  presetDarkPalettes: function () {
    return E;
  },
  presetPalettes: function () {
    return x;
  },
  presetPrimaryColors: function () {
    return w;
  },
  purple: function () {
    return N;
  },
  red: function () {
    return k;
  },
  volcano: function () {
    return S;
  },
  yellow: function () {
    return A;
  }
});
var n = require("96299");
var i = require("28556");
var o = 2;
var a = 0.16;
var s = 0.05;
var u = 0.05;
var l = 0.15;
var c = 5;
var p = 4;
var d = [{
  index: 7,
  opacity: 0.15
}, {
  index: 6,
  opacity: 0.25
}, {
  index: 5,
  opacity: 0.3
}, {
  index: 5,
  opacity: 0.45
}, {
  index: 5,
  opacity: 0.65
}, {
  index: 5,
  opacity: 0.85
}, {
  index: 4,
  opacity: 0.9
}, {
  index: 3,
  opacity: 0.95
}, {
  index: 2,
  opacity: 0.97
}, {
  index: 1,
  opacity: 0.98
}];
function f(e) {
  var t = e.r;
  var r = e.g;
  var i = e.b;
  var o = (0, n.py)(t, r, i);
  return {
    h: o.h * 360,
    s: o.s,
    v: o.v
  };
}
function g(e) {
  var t = e.r;
  var r = e.g;
  var i = e.b;
  return `#${(0, n.vq)(t, r, i, false)}`;
}
function m(e, t, r) {
  var n = r / 100;
  var i = {
    r: (t.r - e.r) * n + e.r,
    g: (t.g - e.g) * n + e.g,
    b: (t.b - e.b) * n + e.b
  };
  return i;
}
function v(e, t, r) {
  var n;
  n = Math.round(e.h) >= 60 && Math.round(e.h) <= 240 ? r ? Math.round(e.h) - o * t : Math.round(e.h) + o * t : r ? Math.round(e.h) + o * t : Math.round(e.h) - o * t;
  if (n < 0) {
    n += 360;
  } else if (n >= 360) {
    n -= 360;
  }
  return n;
}
function y(e, t, r) {
  if (e.h === 0 && e.s === 0) {
    return e.s;
  } else {
    n = r ? e.s - a * t : t === p ? e.s + a : e.s + s * t;
    if (n > 1) {
      n = 1;
    }
    if (r && t === c && n > 0.1) {
      n = 0.1;
    }
    if (n < 0.06) {
      n = 0.06;
    }
    return Number(n.toFixed(2));
  }
  var n;
}
function h(e, t, r) {
  var n;
  n = r ? e.v + u * t : e.v - l * t;
  if (n > 1) {
    n = 1;
  }
  return Number(n.toFixed(2));
}
function b(e, t = {}) {
  var r = [];
  var n = (0, i.uA)(e);
  for (var o = c; o > 0; o -= 1) {
    var a = f(n);
    var s = g((0, i.uA)({
      h: v(a, o, true),
      s: y(a, o, true),
      v: h(a, o, true)
    }));
    r.push(s);
  }
  r.push(g(n));
  for (var u = 1; u <= p; u += 1) {
    var l = f(n);
    var b = g((0, i.uA)({
      h: v(l, u),
      s: y(l, u),
      v: h(l, u)
    }));
    r.push(b);
  }
  if (t.theme === "dark") {
    return d.map(function (e) {
      var n = e.index;
      var o = e.opacity;
      var a = g(m((0, i.uA)(t.backgroundColor || "#141414"), (0, i.uA)(r[n]), o * 100));
      return a;
    });
  } else {
    return r;
  }
}
var w = {
  red: "#F5222D",
  volcano: "#FA541C",
  orange: "#FA8C16",
  gold: "#FAAD14",
  yellow: "#FADB14",
  lime: "#A0D911",
  green: "#52C41A",
  cyan: "#13C2C2",
  blue: "#1890FF",
  geekblue: "#2F54EB",
  purple: "#722ED1",
  magenta: "#EB2F96",
  grey: "#666666"
};
var x = {};
var E = {};
Object.keys(w).forEach(function (e) {
  x[e] = b(w[e]);
  x[e].primary = x[e][5];
  E[e] = b(w[e], {
    theme: "dark",
    backgroundColor: "#141414"
  });
  E[e].primary = E[e][5];
});
var k = x.red;
var S = x.volcano;
var T = x.gold;
var C = x.orange;
var A = x.yellow;
var _ = x.lime;
var O = x.green;
var M = x.cyan;
var P = x.blue;
var q = x.geekblue;
var N = x.purple;
var R = x.magenta;
var I = x.grey;
};
