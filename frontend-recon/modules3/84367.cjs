// webpack module 84367 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60511.js");
var i = require("./38666.js");
var o = require("./83721.js");
function a(e) {
  return e && e.getTime && !isNaN(e.getTime());
}
function s(e) {
  if (e instanceof Date) {
    return e;
  } else {
    return new Date(e);
  }
}
exports.ACCRINT = function (e, t, r, o, u, l, c) {
  e = s(e);
  t = s(t);
  r = s(r);
  if (a(e) && a(t) && a(r)) {
    if (o <= 0 || u <= 0 || [1, 2, 4].indexOf(l) === -1 || [0, 1, 2, 3, 4].indexOf(c) === -1 || r <= e) {
      return n.num;
    } else {
      u = u || 0;
      c = c || 0;
      return u * o * i.YEARFRAC(e, r, c);
    }
  } else {
    return n.value;
  }
};
exports.ACCRINTM = function () {
  throw new Error("ACCRINTM is not implemented");
};
exports.AMORDEGRC = function () {
  throw new Error("AMORDEGRC is not implemented");
};
exports.AMORLINC = function () {
  throw new Error("AMORLINC is not implemented");
};
exports.COUPDAYBS = function () {
  throw new Error("COUPDAYBS is not implemented");
};
exports.COUPDAYS = function () {
  throw new Error("COUPDAYS is not implemented");
};
exports.COUPDAYSNC = function () {
  throw new Error("COUPDAYSNC is not implemented");
};
exports.COUPNCD = function () {
  throw new Error("COUPNCD is not implemented");
};
exports.COUPNUM = function () {
  throw new Error("COUPNUM is not implemented");
};
exports.COUPPCD = function () {
  throw new Error("COUPPCD is not implemented");
};
exports.CUMIPMT = function (e, r, i, a, s, u) {
  e = o.parseNumber(e);
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  if (o.anyIsError(e, r, i)) {
    return n.value;
  }
  if (e <= 0 || r <= 0 || i <= 0) {
    return n.num;
  }
  if (a < 1 || s < 1 || a > s) {
    return n.num;
  }
  if (u !== 0 && u !== 1) {
    return n.num;
  }
  var l = exports.PMT(e, r, i, 0, u);
  var c = 0;
  if (a === 1) {
    if (u === 0) {
      c = -i;
    }
    a++;
  }
  for (var p = a; p <= s; p++) {
    c += u === 1 ? exports.FV(e, p - 2, l, i, 1) - l : exports.FV(e, p - 1, l, i, 0);
  }
  c *= e;
  return c;
};
exports.CUMPRINC = function (e, r, i, a, s, u) {
  e = o.parseNumber(e);
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  if (o.anyIsError(e, r, i)) {
    return n.value;
  }
  if (e <= 0 || r <= 0 || i <= 0) {
    return n.num;
  }
  if (a < 1 || s < 1 || a > s) {
    return n.num;
  }
  if (u !== 0 && u !== 1) {
    return n.num;
  }
  var l = exports.PMT(e, r, i, 0, u);
  var c = 0;
  if (a === 1) {
    c = u === 0 ? l + i * e : l;
    a++;
  }
  for (var p = a; p <= s; p++) {
    c += u > 0 ? l - (exports.FV(e, p - 2, l, i, 1) - l) * e : l - exports.FV(e, p - 1, l, i, 0) * e;
  }
  return c;
};
exports.DB = function (e, t, r, i, a) {
  a = a === undefined ? 12 : a;
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  a = o.parseNumber(a);
  if (o.anyIsError(e, t, r, i, a)) {
    return n.value;
  }
  if (e < 0 || t < 0 || r < 0 || i < 0) {
    return n.num;
  }
  if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].indexOf(a) === -1) {
    return n.num;
  }
  if (i > r) {
    return n.num;
  }
  if (t >= e) {
    return 0;
  }
  var s = (1 - Math.pow(t / e, 1 / r)).toFixed(3);
  var u = e * s * a / 12;
  var l = u;
  var c = 0;
  for (var p = i === r ? r - 1 : i, d = 2; d <= p; d++) {
    c = (e - l) * s;
    l += c;
  }
  if (i === 1) {
    return u;
  } else if (i === r) {
    return (e - l) * s;
  } else {
    return c;
  }
};
exports.DDB = function (e, t, r, i, a) {
  a = a === undefined ? 2 : a;
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  a = o.parseNumber(a);
  if (o.anyIsError(e, t, r, i, a)) {
    return n.value;
  }
  if (e < 0 || t < 0 || r < 0 || i < 0 || a <= 0) {
    return n.num;
  }
  if (i > r) {
    return n.num;
  }
  if (t >= e) {
    return 0;
  }
  var s = 0;
  var u = 0;
  for (var l = 1; l <= i; l++) {
    u = Math.min(a / r * (e - s), e - t - s);
    s += u;
  }
  return u;
};
exports.DISC = function () {
  throw new Error("DISC is not implemented");
};
exports.DOLLARDE = function (e, t) {
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  if (o.anyIsError(e, t)) {
    return n.value;
  }
  if (t < 0) {
    return n.num;
  }
  if (t >= 0 && t < 1) {
    return n.div0;
  }
  t = parseInt(t, 10);
  var r = parseInt(e, 10);
  r += e % 1 * Math.pow(10, Math.ceil(Math.log(t) / Math.LN10)) / t;
  var i = Math.pow(10, Math.ceil(Math.log(t) / Math.LN2) + 1);
  r = Math.round(r * i) / i;
  return r;
};
exports.DOLLARFR = function (e, t) {
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  if (o.anyIsError(e, t)) {
    return n.value;
  }
  if (t < 0) {
    return n.num;
  }
  if (t >= 0 && t < 1) {
    return n.div0;
  }
  t = parseInt(t, 10);
  var r = parseInt(e, 10);
  r += e % 1 * Math.pow(10, -Math.ceil(Math.log(t) / Math.LN10)) * t;
  return r;
};
exports.DURATION = function () {
  throw new Error("DURATION is not implemented");
};
exports.EFFECT = function (e, t) {
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  if (o.anyIsError(e, t)) {
    return n.value;
  } else if (e <= 0 || t < 1) {
    return n.num;
  } else {
    t = parseInt(t, 10);
    return Math.pow(1 + e / t, t) - 1;
  }
};
exports.FV = function (e, t, r, i, a) {
  i = i || 0;
  a = a || 0;
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  a = o.parseNumber(a);
  if (o.anyIsError(e, t, r, i, a)) {
    return n.value;
  }
  var s;
  if (e === 0) {
    s = i + r * t;
  } else {
    var u = Math.pow(1 + e, t);
    s = a === 1 ? i * u + r * (1 + e) * (u - 1) / e : i * u + r * (u - 1) / e;
  }
  return -s;
};
exports.FVSCHEDULE = function (e, t) {
  e = o.parseNumber(e);
  t = o.parseNumberArray(o.flatten(t));
  if (o.anyIsError(e, t)) {
    return n.value;
  }
  for (var r = t.length, i = e, a = 0; a < r; a++) {
    i *= 1 + t[a];
  }
  return i;
};
exports.INTRATE = function () {
  throw new Error("INTRATE is not implemented");
};
exports.IPMT = function (e, r, i, a, s, u) {
  s = s || 0;
  u = u || 0;
  e = o.parseNumber(e);
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  a = o.parseNumber(a);
  s = o.parseNumber(s);
  u = o.parseNumber(u);
  if (o.anyIsError(e, r, i, a, s, u)) {
    return n.value;
  }
  var l;
  var c = exports.PMT(e, i, a, s, u);
  l = r === 1 ? u === 1 ? 0 : -a : u === 1 ? exports.FV(e, r - 2, c, a, 1) - c : exports.FV(e, r - 1, c, a, 0);
  return l * e;
};
exports.IRR = function (e, t) {
  t = t || 0;
  e = o.parseNumberArray(o.flatten(e));
  t = o.parseNumber(t);
  if (o.anyIsError(e, t)) {
    return n.value;
  }
  var r = function (e, t, r) {
    var n = r + 1;
    var i = e[0];
    for (var o = 1; o < e.length; o++) {
      i += e[o] / Math.pow(n, (t[o] - t[0]) / 365);
    }
    return i;
  };
  var i = function (e, t, r) {
    var n = r + 1;
    var i = 0;
    for (var o = 1; o < e.length; o++) {
      var a = (t[o] - t[0]) / 365;
      i -= a * e[o] / Math.pow(n, a + 1);
    }
    return i;
  };
  var a = [];
  var s = false;
  var u = false;
  for (var l = 0; l < e.length; l++) {
    a[l] = l === 0 ? 0 : a[l - 1] + 365;
    if (e[l] > 0) {
      s = true;
    }
    if (e[l] < 0) {
      u = true;
    }
  }
  if (!s || !u) {
    return n.num;
  }
  t = t === undefined ? 0.1 : t;
  var c;
  var p;
  var d;
  var f = t;
  var g = 1e-10;
  var m = true;
  do {
    d = r(e, a, f);
    c = f - d / i(e, a, f);
    p = Math.abs(c - f);
    f = c;
    m = p > g && Math.abs(d) > g;
  } while (m);
  return f;
};
exports.ISPMT = function (e, t, r, i) {
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  if (o.anyIsError(e, t, r, i)) {
    return n.value;
  } else {
    return i * e * (t / r - 1);
  }
};
exports.MDURATION = function () {
  throw new Error("MDURATION is not implemented");
};
exports.MIRR = function (e, r, i) {
  e = o.parseNumberArray(o.flatten(e));
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  if (o.anyIsError(e, r, i)) {
    return n.value;
  }
  for (var a = e.length, s = [], u = [], l = 0; l < a; l++) {
    if (e[l] < 0) {
      s.push(e[l]);
    } else {
      u.push(e[l]);
    }
  }
  var c = -exports.NPV(i, u) * Math.pow(1 + i, a - 1);
  var p = exports.NPV(r, s) * (1 + r);
  return Math.pow(c / p, 1 / (a - 1)) - 1;
};
exports.NOMINAL = function (e, t) {
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  if (o.anyIsError(e, t)) {
    return n.value;
  } else if (e <= 0 || t < 1) {
    return n.num;
  } else {
    t = parseInt(t, 10);
    return (Math.pow(e + 1, 1 / t) - 1) * t;
  }
};
exports.NPER = function (e, t, r, i, a) {
  a = a === undefined ? 0 : a;
  i = i === undefined ? 0 : i;
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  a = o.parseNumber(a);
  if (o.anyIsError(e, t, r, i, a)) {
    return n.value;
  }
  if (e === 0) {
    return -(r + i) / t;
  }
  var s = t * (1 + e * a) - i * e;
  var u = r * e + t * (1 + e * a);
  return Math.log(s / u) / Math.log(1 + e);
};
exports.NPV = function () {
  var e = o.parseNumberArray(o.flatten(arguments));
  if (e instanceof Error) {
    return e;
  }
  var t = e[0];
  var r = 0;
  for (var n = 1; n < e.length; n++) {
    r += e[n] / Math.pow(1 + t, n);
  }
  return r;
};
exports.ODDFPRICE = function () {
  throw new Error("ODDFPRICE is not implemented");
};
exports.ODDFYIELD = function () {
  throw new Error("ODDFYIELD is not implemented");
};
exports.ODDLPRICE = function () {
  throw new Error("ODDLPRICE is not implemented");
};
exports.ODDLYIELD = function () {
  throw new Error("ODDLYIELD is not implemented");
};
exports.PDURATION = function (e, t, r) {
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  r = o.parseNumber(r);
  if (o.anyIsError(e, t, r)) {
    return n.value;
  } else if (e <= 0) {
    return n.num;
  } else {
    return (Math.log(r) - Math.log(t)) / Math.log(1 + e);
  }
};
exports.PMT = function (e, t, r, i, a) {
  i = i || 0;
  a = a || 0;
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  a = o.parseNumber(a);
  if (o.anyIsError(e, t, r, i, a)) {
    return n.value;
  }
  var s;
  if (e === 0) {
    s = (r + i) / t;
  } else {
    var u = Math.pow(1 + e, t);
    s = a === 1 ? (i * e / (u - 1) + r * e / (1 - 1 / u)) / (1 + e) : i * e / (u - 1) + r * e / (1 - 1 / u);
  }
  return -s;
};
exports.PPMT = function (e, r, i, a, s, u) {
  s = s || 0;
  u = u || 0;
  e = o.parseNumber(e);
  i = o.parseNumber(i);
  a = o.parseNumber(a);
  s = o.parseNumber(s);
  u = o.parseNumber(u);
  if (o.anyIsError(e, i, a, s, u)) {
    return n.value;
  } else {
    return exports.PMT(e, i, a, s, u) - exports.IPMT(e, r, i, a, s, u);
  }
};
exports.PRICE = function () {
  throw new Error("PRICE is not implemented");
};
exports.PRICEDISC = function () {
  throw new Error("PRICEDISC is not implemented");
};
exports.PRICEMAT = function () {
  throw new Error("PRICEMAT is not implemented");
};
exports.PV = function (e, t, r, i, a) {
  i = i || 0;
  a = a || 0;
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  a = o.parseNumber(a);
  if (o.anyIsError(e, t, r, i, a)) {
    return n.value;
  } else if (e === 0) {
    return -r * t - i;
  } else {
    return ((1 - Math.pow(1 + e, t)) / e * r * (1 + e * a) - i) / Math.pow(1 + e, t);
  }
};
exports.RATE = function (e, t, r, i, a, s) {
  s = s === undefined ? 0.01 : s;
  i = i === undefined ? 0 : i;
  a = a === undefined ? 0 : a;
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  a = o.parseNumber(a);
  s = o.parseNumber(s);
  if (o.anyIsError(e, t, r, i, a, s)) {
    return n.value;
  }
  var u = 1e-10;
  var l = 20;
  var c = s;
  a = a ? 1 : 0;
  for (var p = 0; p < l; p++) {
    if (c <= -1) {
      return n.num;
    }
    var d;
    var f;
    var g;
    if (Math.abs(c) < u) {
      d = r * (1 + e * c) + t * (1 + c * a) * e + i;
    } else {
      f = Math.pow(1 + c, e);
      d = r * f + t * (1 / c + a) * (f - 1) + i;
    }
    if (Math.abs(d) < u) {
      return c;
    }
    if (Math.abs(c) < u) {
      g = r * e + t * a * e;
    } else {
      f = Math.pow(1 + c, e);
      var m = e * Math.pow(1 + c, e - 1);
      g = r * m + t * (1 / c + a) * m + t * (-1 / (c * c)) * (f - 1);
    }
    c -= d / g;
  }
  return c;
};
exports.RECEIVED = function () {
  throw new Error("RECEIVED is not implemented");
};
exports.RRI = function (e, t, r) {
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  r = o.parseNumber(r);
  if (o.anyIsError(e, t, r)) {
    return n.value;
  } else if (e === 0 || t === 0) {
    return n.num;
  } else {
    return Math.pow(r / t, 1 / e) - 1;
  }
};
exports.SLN = function (e, t, r) {
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  r = o.parseNumber(r);
  if (o.anyIsError(e, t, r)) {
    return n.value;
  } else if (r === 0) {
    return n.num;
  } else {
    return (e - t) / r;
  }
};
exports.SYD = function (e, t, r, i) {
  e = o.parseNumber(e);
  t = o.parseNumber(t);
  r = o.parseNumber(r);
  i = o.parseNumber(i);
  if (o.anyIsError(e, t, r, i)) {
    return n.value;
  } else if (r === 0 || i < 1 || i > r) {
    return n.num;
  } else {
    i = parseInt(i, 10);
    return (e - t) * (r - i + 1) * 2 / (r * (r + 1));
  }
};
exports.TBILLEQ = function (e, t, r) {
  e = o.parseDate(e);
  t = o.parseDate(t);
  r = o.parseNumber(r);
  if (o.anyIsError(e, t, r)) {
    return n.value;
  } else if (r <= 0 || e > t || t - e > 31536000000) {
    return n.num;
  } else {
    return r * 365 / (360 - r * i.DAYS360(e, t, false));
  }
};
exports.TBILLPRICE = function (e, t, r) {
  e = o.parseDate(e);
  t = o.parseDate(t);
  r = o.parseNumber(r);
  if (o.anyIsError(e, t, r)) {
    return n.value;
  } else if (r <= 0 || e > t || t - e > 31536000000) {
    return n.num;
  } else {
    return (1 - r * i.DAYS360(e, t, false) / 360) * 100;
  }
};
exports.TBILLYIELD = function (e, t, r) {
  e = o.parseDate(e);
  t = o.parseDate(t);
  r = o.parseNumber(r);
  if (o.anyIsError(e, t, r)) {
    return n.value;
  } else if (r <= 0 || e > t || t - e > 31536000000) {
    return n.num;
  } else {
    return (100 - r) * 360 / (r * i.DAYS360(e, t, false));
  }
};
exports.VDB = function () {
  throw new Error("VDB is not implemented");
};
exports.XIRR = function (e, t, r) {
  e = o.parseNumberArray(o.flatten(e));
  t = o.parseDateArray(o.flatten(t));
  r = o.parseNumber(r);
  if (o.anyIsError(e, t, r)) {
    return n.value;
  }
  var a = function (e, t, r) {
    var n = r + 1;
    var o = e[0];
    for (var a = 1; a < e.length; a++) {
      o += e[a] / Math.pow(n, i.DAYS(t[a], t[0]) / 365);
    }
    return o;
  };
  var s = function (e, t, r) {
    var n = r + 1;
    var o = 0;
    for (var a = 1; a < e.length; a++) {
      var s = i.DAYS(t[a], t[0]) / 365;
      o -= s * e[a] / Math.pow(n, s + 1);
    }
    return o;
  };
  var u = false;
  var l = false;
  for (var c = 0; c < e.length; c++) {
    if (e[c] > 0) {
      u = true;
    }
    if (e[c] < 0) {
      l = true;
    }
  }
  if (!u || !l) {
    return n.num;
  }
  r = r || 0.1;
  var p;
  var d;
  var f;
  var g = r;
  var m = 1e-10;
  var v = true;
  do {
    f = a(e, t, g);
    p = g - f / s(e, t, g);
    d = Math.abs(p - g);
    g = p;
    v = d > m && Math.abs(f) > m;
  } while (v);
  return g;
};
exports.XNPV = function (e, t, r) {
  e = o.parseNumber(e);
  t = o.parseNumberArray(o.flatten(t));
  r = o.parseDateArray(o.flatten(r));
  if (o.anyIsError(e, t, r)) {
    return n.value;
  }
  var a = 0;
  for (var s = 0; s < t.length; s++) {
    a += t[s] / Math.pow(1 + e, i.DAYS(r[s], r[0]) / 365);
  }
  return a;
};
exports.YIELD = function () {
  throw new Error("YIELD is not implemented");
};
exports.YIELDDISC = function () {
  throw new Error("YIELDDISC is not implemented");
};
exports.YIELDMAT = function () {
  throw new Error("YIELDMAT is not implemented");
};
};
