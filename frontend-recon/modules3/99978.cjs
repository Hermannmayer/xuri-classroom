// webpack module 99978 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  C: function () {
    return s;
  },
  H: function () {
    return u;
  }
});
var n = require("./96299.js");
var i = require("./76367.js");
var o = require("./28556.js");
var a = require("./23881.js");
var s = function () {
  function e(t, r) {
    if (t === undefined) {
      t = "";
    }
    if (r === undefined) {
      r = {};
    }
    if (t instanceof e) {
      return t;
    }
    if (typeof t === "number") {
      t = (0, n.Yt)(t);
    }
    this.originalInput = t;
    var a = (0, o.uA)(t);
    this.originalInput = t;
    this.r = a.r;
    this.g = a.g;
    this.b = a.b;
    this.a = a.a;
    this.roundA = Math.round(this.a * 100) / 100;
    this.format = r.format ?? a.format;
    this.gradientType = r.gradientType;
    if (this.r < 1) {
      this.r = Math.round(this.r);
    }
    if (this.g < 1) {
      this.g = Math.round(this.g);
    }
    if (this.b < 1) {
      this.b = Math.round(this.b);
    }
    this.isValid = a.ok;
  }
  e.prototype.isDark = function () {
    return this.getBrightness() < 128;
  };
  e.prototype.isLight = function () {
    return !this.isDark();
  };
  e.prototype.getBrightness = function () {
    var e = this.toRgb();
    return (e.r * 299 + e.g * 587 + e.b * 114) / 1000;
  };
  e.prototype.getLuminance = function () {
    var e;
    var t;
    var r;
    var n = this.toRgb();
    var i = n.r / 255;
    var o = n.g / 255;
    var a = n.b / 255;
    e = i <= 0.03928 ? i / 12.92 : Math.pow((i + 0.055) / 1.055, 2.4);
    t = o <= 0.03928 ? o / 12.92 : Math.pow((o + 0.055) / 1.055, 2.4);
    r = a <= 0.03928 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4);
    return e * 0.2126 + t * 0.7152 + r * 0.0722;
  };
  e.prototype.getAlpha = function () {
    return this.a;
  };
  e.prototype.setAlpha = function (e) {
    this.a = (0, a.Yq)(e);
    this.roundA = Math.round(this.a * 100) / 100;
    return this;
  };
  e.prototype.isMonochrome = function () {
    var e = this.toHsl().s;
    return e === 0;
  };
  e.prototype.toHsv = function () {
    var e = (0, n.py)(this.r, this.g, this.b);
    return {
      h: e.h * 360,
      s: e.s,
      v: e.v,
      a: this.a
    };
  };
  e.prototype.toHsvString = function () {
    var e = (0, n.py)(this.r, this.g, this.b);
    var t = Math.round(e.h * 360);
    var r = Math.round(e.s * 100);
    var i = Math.round(e.v * 100);
    if (this.a === 1) {
      return `hsv(${t}, ${r}%, ${i}%)`;
    } else {
      return `hsva(${t}, ${r}%, ${i}%, ${this.roundA})`;
    }
  };
  e.prototype.toHsl = function () {
    var e = (0, n.lC)(this.r, this.g, this.b);
    return {
      h: e.h * 360,
      s: e.s,
      l: e.l,
      a: this.a
    };
  };
  e.prototype.toHslString = function () {
    var e = (0, n.lC)(this.r, this.g, this.b);
    var t = Math.round(e.h * 360);
    var r = Math.round(e.s * 100);
    var i = Math.round(e.l * 100);
    if (this.a === 1) {
      return `hsl(${t}, ${r}%, ${i}%)`;
    } else {
      return `hsla(${t}, ${r}%, ${i}%, ${this.roundA})`;
    }
  };
  e.prototype.toHex = function (e = false) {
    return (0, n.vq)(this.r, this.g, this.b, e);
  };
  e.prototype.toHexString = function (e = false) {
    return "#" + this.toHex(e);
  };
  e.prototype.toHex8 = function (e = false) {
    return (0, n.s)(this.r, this.g, this.b, this.a, e);
  };
  e.prototype.toHex8String = function (e = false) {
    return "#" + this.toHex8(e);
  };
  e.prototype.toHexShortString = function (e = false) {
    if (this.a === 1) {
      return this.toHexString(e);
    } else {
      return this.toHex8String(e);
    }
  };
  e.prototype.toRgb = function () {
    return {
      r: Math.round(this.r),
      g: Math.round(this.g),
      b: Math.round(this.b),
      a: this.a
    };
  };
  e.prototype.toRgbString = function () {
    var e = Math.round(this.r);
    var t = Math.round(this.g);
    var r = Math.round(this.b);
    if (this.a === 1) {
      return `rgb(${e}, ${t}, ${r})`;
    } else {
      return `rgba(${e}, ${t}, ${r}, ${this.roundA})`;
    }
  };
  e.prototype.toPercentageRgb = function () {
    function e(e) {
      return `${Math.round((0, a.sh)(e, 255) * 100)}%`;
    }
    return {
      r: e(this.r),
      g: e(this.g),
      b: e(this.b),
      a: this.a
    };
  };
  e.prototype.toPercentageRgbString = function () {
    function e(e) {
      return Math.round((0, a.sh)(e, 255) * 100);
    }
    if (this.a === 1) {
      return `rgb(${e(this.r)}%, ${e(this.g)}%, ${e(this.b)}%)`;
    } else {
      return `rgba(${e(this.r)}%, ${e(this.g)}%, ${e(this.b)}%, ${this.roundA})`;
    }
  };
  e.prototype.toName = function () {
    if (this.a === 0) {
      return "transparent";
    }
    if (this.a < 1) {
      return false;
    }
    var e = "#" + (0, n.vq)(this.r, this.g, this.b, false);
    for (var t = 0, r = Object.entries(i.R); t < r.length; t++) {
      var o = r[t];
      var a = o[0];
      var s = o[1];
      if (e === s) {
        return a;
      }
    }
    return false;
  };
  e.prototype.toString = function (e) {
    var t = Boolean(e);
    e = e ?? this.format;
    var r = false;
    var n = this.a < 1 && this.a >= 0;
    var i = !t && n && (e.startsWith("hex") || e === "name");
    if (i) {
      if (e === "name" && this.a === 0) {
        return this.toName();
      } else {
        return this.toRgbString();
      }
    } else {
      if (e === "rgb") {
        r = this.toRgbString();
      }
      if (e === "prgb") {
        r = this.toPercentageRgbString();
      }
      if (e === "hex" || e === "hex6") {
        r = this.toHexString();
      }
      if (e === "hex3") {
        r = this.toHexString(true);
      }
      if (e === "hex4") {
        r = this.toHex8String(true);
      }
      if (e === "hex8") {
        r = this.toHex8String();
      }
      if (e === "name") {
        r = this.toName();
      }
      if (e === "hsl") {
        r = this.toHslString();
      }
      if (e === "hsv") {
        r = this.toHsvString();
      }
      return r || this.toHexString();
    }
  };
  e.prototype.toNumber = function () {
    return (Math.round(this.r) << 16) + (Math.round(this.g) << 8) + Math.round(this.b);
  };
  e.prototype.clone = function () {
    return new e(this.toString());
  };
  e.prototype.lighten = function (t = 10) {
    var r = this.toHsl();
    r.l += t / 100;
    r.l = (0, a.V2)(r.l);
    return new e(r);
  };
  e.prototype.brighten = function (t = 10) {
    var r = this.toRgb();
    r.r = Math.max(0, Math.min(255, r.r - Math.round(-t / 100 * 255)));
    r.g = Math.max(0, Math.min(255, r.g - Math.round(-t / 100 * 255)));
    r.b = Math.max(0, Math.min(255, r.b - Math.round(-t / 100 * 255)));
    return new e(r);
  };
  e.prototype.darken = function (t = 10) {
    var r = this.toHsl();
    r.l -= t / 100;
    r.l = (0, a.V2)(r.l);
    return new e(r);
  };
  e.prototype.tint = function (e = 10) {
    return this.mix("white", e);
  };
  e.prototype.shade = function (e = 10) {
    return this.mix("black", e);
  };
  e.prototype.desaturate = function (t = 10) {
    var r = this.toHsl();
    r.s -= t / 100;
    r.s = (0, a.V2)(r.s);
    return new e(r);
  };
  e.prototype.saturate = function (t = 10) {
    var r = this.toHsl();
    r.s += t / 100;
    r.s = (0, a.V2)(r.s);
    return new e(r);
  };
  e.prototype.greyscale = function () {
    return this.desaturate(100);
  };
  e.prototype.spin = function (t) {
    var r = this.toHsl();
    var n = (r.h + t) % 360;
    r.h = n < 0 ? 360 + n : n;
    return new e(r);
  };
  e.prototype.mix = function (t, r = 50) {
    var n = this.toRgb();
    var i = new e(t).toRgb();
    var o = r / 100;
    var a = {
      r: (i.r - n.r) * o + n.r,
      g: (i.g - n.g) * o + n.g,
      b: (i.b - n.b) * o + n.b,
      a: (i.a - n.a) * o + n.a
    };
    return new e(a);
  };
  e.prototype.analogous = function (t = 6, r = 30) {
    var n = this.toHsl();
    var i = 360 / r;
    var o = [this];
    for (n.h = (n.h - (i * t >> 1) + 720) % 360; --t;) {
      n.h = (n.h + i) % 360;
      o.push(new e(n));
    }
    return o;
  };
  e.prototype.complement = function () {
    var t = this.toHsl();
    t.h = (t.h + 180) % 360;
    return new e(t);
  };
  e.prototype.monochromatic = function (t = 6) {
    var r = this.toHsv();
    var n = r.h;
    var i = r.s;
    var o = r.v;
    var a = [];
    var s = 1 / t;
    while (t--) {
      a.push(new e({
        h: n,
        s: i,
        v: o
      }));
      o = (o + s) % 1;
    }
    return a;
  };
  e.prototype.splitcomplement = function () {
    var t = this.toHsl();
    var r = t.h;
    return [this, new e({
      h: (r + 72) % 360,
      s: t.s,
      l: t.l
    }), new e({
      h: (r + 216) % 360,
      s: t.s,
      l: t.l
    })];
  };
  e.prototype.onBackground = function (t) {
    var r = this.toRgb();
    var n = new e(t).toRgb();
    var i = r.a + n.a * (1 - r.a);
    return new e({
      r: (r.r * r.a + n.r * n.a * (1 - r.a)) / i,
      g: (r.g * r.a + n.g * n.a * (1 - r.a)) / i,
      b: (r.b * r.a + n.b * n.a * (1 - r.a)) / i,
      a: i
    });
  };
  e.prototype.triad = function () {
    return this.polyad(3);
  };
  e.prototype.tetrad = function () {
    return this.polyad(4);
  };
  e.prototype.polyad = function (t) {
    var r = this.toHsl();
    var n = r.h;
    var i = [this];
    var o = 360 / t;
    for (var a = 1; a < t; a++) {
      i.push(new e({
        h: (n + a * o) % 360,
        s: r.s,
        l: r.l
      }));
    }
    return i;
  };
  e.prototype.equals = function (t) {
    return this.toRgbString() === new e(t).toRgbString();
  };
  return e;
}();
function u(e = "", t = {}) {
  return new s(e, t);
}
};
