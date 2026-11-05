// webpack module 96299 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  rW: function () {
    return i;
  },
  lC: function () {
    return o;
  },
  ve: function () {
    return s;
  },
  py: function () {
    return u;
  },
  WE: function () {
    return l;
  },
  vq: function () {
    return c;
  },
  s: function () {
    return p;
  },
  GC: function () {
    return d;
  },
  Wl: function () {
    return f;
  },
  T6: function () {
    return g;
  },
  VD: function () {
    return m;
  },
  Yt: function () {
    return v;
  }
});
var n = require("./23881.js");
function i(e, t, r) {
  return {
    r: (0, n.sh)(e, 255) * 255,
    g: (0, n.sh)(t, 255) * 255,
    b: (0, n.sh)(r, 255) * 255
  };
}
function o(e, t, r) {
  e = (0, n.sh)(e, 255);
  t = (0, n.sh)(t, 255);
  r = (0, n.sh)(r, 255);
  var i = Math.max(e, t, r);
  var o = Math.min(e, t, r);
  var a = 0;
  var s = 0;
  var u = (i + o) / 2;
  if (i === o) {
    s = 0;
    a = 0;
  } else {
    var l = i - o;
    s = u > 0.5 ? l / (2 - i - o) : l / (i + o);
    switch (i) {
      case e:
        a = (t - r) / l + (t < r ? 6 : 0);
        break;
      case t:
        a = (r - e) / l + 2;
        break;
      case r:
        a = (e - t) / l + 4;
        break;
      default:
        break;
    }
    a /= 6;
  }
  return {
    h: a,
    s: s,
    l: u
  };
}
function a(e, t, r) {
  if (r < 0) {
    r += 1;
  }
  if (r > 1) {
    r -= 1;
  }
  if (r < 1 / 6) {
    return e + r * 6 * (t - e);
  } else if (r < 0.5) {
    return t;
  } else if (r < 2 / 3) {
    return e + (t - e) * (2 / 3 - r) * 6;
  } else {
    return e;
  }
}
function s(e, t, r) {
  var i;
  var o;
  var s;
  e = (0, n.sh)(e, 360);
  t = (0, n.sh)(t, 100);
  r = (0, n.sh)(r, 100);
  if (t === 0) {
    o = r;
    s = r;
    i = r;
  } else {
    var u = r < 0.5 ? r * (1 + t) : r + t - r * t;
    var l = r * 2 - u;
    i = a(l, u, e + 1 / 3);
    o = a(l, u, e);
    s = a(l, u, e - 1 / 3);
  }
  return {
    r: i * 255,
    g: o * 255,
    b: s * 255
  };
}
function u(e, t, r) {
  e = (0, n.sh)(e, 255);
  t = (0, n.sh)(t, 255);
  r = (0, n.sh)(r, 255);
  var i = Math.max(e, t, r);
  var o = Math.min(e, t, r);
  var a = 0;
  var s = i;
  var u = i - o;
  var l = i === 0 ? 0 : u / i;
  if (i === o) {
    a = 0;
  } else {
    switch (i) {
      case e:
        a = (t - r) / u + (t < r ? 6 : 0);
        break;
      case t:
        a = (r - e) / u + 2;
        break;
      case r:
        a = (e - t) / u + 4;
        break;
      default:
        break;
    }
    a /= 6;
  }
  return {
    h: a,
    s: l,
    v: s
  };
}
function l(e, t, r) {
  e = (0, n.sh)(e, 360) * 6;
  t = (0, n.sh)(t, 100);
  r = (0, n.sh)(r, 100);
  var i = Math.floor(e);
  var o = e - i;
  var a = r * (1 - t);
  var s = r * (1 - o * t);
  var u = r * (1 - (1 - o) * t);
  var l = i % 6;
  var c = [r, s, a, a, u, r][l];
  var p = [u, r, r, s, a, a][l];
  var d = [a, a, u, r, r, s][l];
  return {
    r: c * 255,
    g: p * 255,
    b: d * 255
  };
}
function c(e, t, r, i) {
  var o = [(0, n.FZ)(Math.round(e).toString(16)), (0, n.FZ)(Math.round(t).toString(16)), (0, n.FZ)(Math.round(r).toString(16))];
  if (i && o[0].startsWith(o[0].charAt(1)) && o[1].startsWith(o[1].charAt(1)) && o[2].startsWith(o[2].charAt(1))) {
    return o[0].charAt(0) + o[1].charAt(0) + o[2].charAt(0);
  } else {
    return o.join("");
  }
}
function p(e, t, r, i, o) {
  var a = [(0, n.FZ)(Math.round(e).toString(16)), (0, n.FZ)(Math.round(t).toString(16)), (0, n.FZ)(Math.round(r).toString(16)), (0, n.FZ)(f(i))];
  if (o && a[0].startsWith(a[0].charAt(1)) && a[1].startsWith(a[1].charAt(1)) && a[2].startsWith(a[2].charAt(1)) && a[3].startsWith(a[3].charAt(1))) {
    return a[0].charAt(0) + a[1].charAt(0) + a[2].charAt(0) + a[3].charAt(0);
  } else {
    return a.join("");
  }
}
function d(e, t, r, i) {
  var o = [(0, n.FZ)(f(i)), (0, n.FZ)(Math.round(e).toString(16)), (0, n.FZ)(Math.round(t).toString(16)), (0, n.FZ)(Math.round(r).toString(16))];
  return o.join("");
}
function f(e) {
  return Math.round(parseFloat(e) * 255).toString(16);
}
function g(e) {
  return m(e) / 255;
}
function m(e) {
  return parseInt(e, 16);
}
function v(e) {
  return {
    r: e >> 16,
    g: (e & 65280) >> 8,
    b: e & 255
  };
}
};
