// webpack module 22611 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  TinyColor: function () {
    return n.C;
  },
  bounds: function () {
    return k;
  },
  convertDecimalToHex: function () {
    return u.Wl;
  },
  convertHexToDecimal: function () {
    return u.T6;
  },
  default: function () {
    return S;
  },
  fromRatio: function () {
    return p;
  },
  hslToRgb: function () {
    return u.ve;
  },
  hsvToRgb: function () {
    return u.WE;
  },
  inputToRGB: function () {
    return f.uA;
  },
  isReadable: function () {
    return a;
  },
  isValidCSSUnit: function () {
    return f.ky;
  },
  legacyRandom: function () {
    return d;
  },
  mostReadable: function () {
    return s;
  },
  names: function () {
    return i.R;
  },
  numberInputToObject: function () {
    return u.Yt;
  },
  parseIntFromHex: function () {
    return u.VD;
  },
  random: function () {
    return g;
  },
  readability: function () {
    return o;
  },
  rgbToHex: function () {
    return u.vq;
  },
  rgbToHsl: function () {
    return u.lC;
  },
  rgbToHsv: function () {
    return u.py;
  },
  rgbToRgb: function () {
    return u.rW;
  },
  rgbaToArgbHex: function () {
    return u.GC;
  },
  rgbaToHex: function () {
    return u.s;
  },
  stringInputToObject: function () {
    return f.uz;
  },
  tinycolor: function () {
    return n.H;
  },
  toMsFilter: function () {
    return l;
  }
});
var n = require("99978");
var i = require("76367");
function o(e, t) {
  var r = new n.C(e);
  var i = new n.C(t);
  return (Math.max(r.getLuminance(), i.getLuminance()) + 0.05) / (Math.min(r.getLuminance(), i.getLuminance()) + 0.05);
}
function a(e, t, r) {
  if (r === undefined) {
    r = {
      level: "AA",
      size: "small"
    };
  }
  var a = o(e, t);
  switch ((r.level ?? "AA") + (r.size ?? "small")) {
    case "AAsmall":
    case "AAAlarge":
      return a >= 4.5;
    case "AAlarge":
      return a >= 3;
    case "AAAsmall":
      return a >= 7;
    default:
      return false;
  }
}
function s(e, t, r = {
  includeFallbackColors: false,
  level: "AA",
  size: "small"
}) {
  var i = null;
  var u = 0;
  var l = r.includeFallbackColors;
  var c = r.level;
  var p = r.size;
  for (var d = 0, f = t; d < f.length; d++) {
    var g = f[d];
    var m = o(e, g);
    if (m > u) {
      u = m;
      i = new n.C(g);
    }
  }
  if (a(e, i, {
    level: c,
    size: p
  }) || !l) {
    return i;
  } else {
    r.includeFallbackColors = false;
    return s(e, ["#fff", "#000"], r);
  }
}
var u = require("96299");
function l(e, t) {
  var r = new n.C(e);
  var i = "#" + (0, u.GC)(r.r, r.g, r.b, r.a);
  var o = i;
  var a = r.gradientType ? "GradientType = 1, " : "";
  if (t) {
    var s = new n.C(t);
    o = "#" + (0, u.GC)(s.r, s.g, s.b, s.a);
  }
  return `progid:DXImageTransform.Microsoft.gradient(${a}startColorstr=${i},endColorstr=${o})`;
}
var c = require("23881");
function p(e, t) {
  var r = {
    r: (0, c.JX)(e.r),
    g: (0, c.JX)(e.g),
    b: (0, c.JX)(e.b)
  };
  if (e.a !== undefined) {
    r.a = Number(e.a);
  }
  return new n.C(r, t);
}
function d() {
  return new n.C({
    r: Math.random(),
    g: Math.random(),
    b: Math.random()
  });
}
var f = require("28556");
function g(e = {}) {
  if (e.count !== undefined && e.count !== null) {
    var t = e.count;
    var r = [];
    e.count = undefined;
    while (t > r.length) {
      e.count = null;
      if (e.seed) {
        e.seed += 1;
      }
      r.push(g(e));
    }
    e.count = t;
    return r;
  }
  var i = m(e.hue, e.seed);
  var o = v(i, e);
  var a = y(i, o, e);
  var s = {
    h: i,
    s: o,
    v: a
  };
  if (e.alpha !== undefined) {
    s.a = e.alpha;
  }
  return new n.C(s);
}
function m(e, t) {
  var r = b(e);
  var n = x(r, t);
  if (n < 0) {
    n = 360 + n;
  }
  return n;
}
function v(e, t) {
  if (t.hue === "monochrome") {
    return 0;
  }
  if (t.luminosity === "random") {
    return x([0, 100], t.seed);
  }
  var r = w(e).saturationRange;
  var n = r[0];
  var i = r[1];
  switch (t.luminosity) {
    case "bright":
      n = 55;
      break;
    case "dark":
      n = i - 10;
      break;
    case "light":
      i = 55;
      break;
    default:
      break;
  }
  return x([n, i], t.seed);
}
function y(e, t, r) {
  var n = h(e, t);
  var i = 100;
  switch (r.luminosity) {
    case "dark":
      i = n + 20;
      break;
    case "light":
      n = (i + n) / 2;
      break;
    case "random":
      n = 0;
      i = 100;
      break;
    default:
      break;
  }
  return x([n, i], r.seed);
}
function h(e, t) {
  for (var r = w(e).lowerBounds, n = 0; n < r.length - 1; n++) {
    var i = r[n][0];
    var o = r[n][1];
    var a = r[n + 1][0];
    var s = r[n + 1][1];
    if (t >= i && t <= a) {
      var u = (s - o) / (a - i);
      var l = o - u * i;
      return u * t + l;
    }
  }
  return 0;
}
function b(e) {
  var t = parseInt(e, 10);
  if (!Number.isNaN(t) && t < 360 && t > 0) {
    return [t, t];
  }
  if (typeof e === "string") {
    var r = k.find(function (t) {
      return t.name === e;
    });
    if (r) {
      var i = E(r);
      if (i.hueRange) {
        return i.hueRange;
      }
    }
    var o = new n.C(e);
    if (o.isValid) {
      var a = o.toHsv().h;
      return [a, a];
    }
  }
  return [0, 360];
}
function w(e) {
  if (e >= 334 && e <= 360) {
    e -= 360;
  }
  for (var t = 0, r = k; t < r.length; t++) {
    var n = r[t];
    var i = E(n);
    if (i.hueRange && e >= i.hueRange[0] && e <= i.hueRange[1]) {
      return i;
    }
  }
  throw Error("Color not found");
}
function x(e, t) {
  if (t === undefined) {
    return Math.floor(e[0] + Math.random() * (e[1] + 1 - e[0]));
  }
  var r = e[1] || 1;
  var n = e[0] || 0;
  t = (t * 9301 + 49297) % 233280;
  var i = t / 233280;
  return Math.floor(n + i * (r - n));
}
function E(e) {
  var t = e.lowerBounds[0][0];
  var r = e.lowerBounds[e.lowerBounds.length - 1][0];
  var n = e.lowerBounds[e.lowerBounds.length - 1][1];
  var i = e.lowerBounds[0][1];
  return {
    name: e.name,
    hueRange: e.hueRange,
    lowerBounds: e.lowerBounds,
    saturationRange: [t, r],
    brightnessRange: [n, i]
  };
}
var k = [{
  name: "monochrome",
  hueRange: null,
  lowerBounds: [[0, 0], [100, 0]]
}, {
  name: "red",
  hueRange: [-26, 18],
  lowerBounds: [[20, 100], [30, 92], [40, 89], [50, 85], [60, 78], [70, 70], [80, 60], [90, 55], [100, 50]]
}, {
  name: "orange",
  hueRange: [19, 46],
  lowerBounds: [[20, 100], [30, 93], [40, 88], [50, 86], [60, 85], [70, 70], [100, 70]]
}, {
  name: "yellow",
  hueRange: [47, 62],
  lowerBounds: [[25, 100], [40, 94], [50, 89], [60, 86], [70, 84], [80, 82], [90, 80], [100, 75]]
}, {
  name: "green",
  hueRange: [63, 178],
  lowerBounds: [[30, 100], [40, 90], [50, 85], [60, 81], [70, 74], [80, 64], [90, 50], [100, 40]]
}, {
  name: "blue",
  hueRange: [179, 257],
  lowerBounds: [[20, 100], [30, 86], [40, 80], [50, 74], [60, 60], [70, 52], [80, 44], [90, 39], [100, 35]]
}, {
  name: "purple",
  hueRange: [258, 282],
  lowerBounds: [[20, 100], [30, 87], [40, 79], [50, 70], [60, 65], [70, 59], [80, 52], [90, 45], [100, 42]]
}, {
  name: "pink",
  hueRange: [283, 334],
  lowerBounds: [[20, 100], [30, 90], [40, 86], [60, 84], [80, 80], [90, 75], [100, 73]]
}];
var S = n.H;
};
