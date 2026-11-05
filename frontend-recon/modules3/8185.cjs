// webpack module 8185 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./83721.js");
var i = require("./60511.js");
var o = require("./3402.js");
var a = require("./67539.js");
var s = require("./70836.js");
exports.ABS = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var t = Math.abs(e);
  return t;
};
exports.ACOS = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var t = Math.acos(e);
  if (isNaN(t)) {
    t = i.num;
  }
  return t;
};
exports.ACOSH = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var t = Math.log(e + Math.sqrt(e * e - 1));
  if (isNaN(t)) {
    t = i.num;
  }
  return t;
};
exports.ACOT = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var t = Math.atan(1 / e);
  return t;
};
exports.ACOTH = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var t = Math.log((e + 1) / (e - 1)) * 0.5;
  if (isNaN(t)) {
    t = i.num;
  }
  return t;
};
exports.AGGREGATE = function (e, r, a, s) {
  e = n.parseNumber(e);
  r = n.parseNumber(e);
  if (n.anyIsError(e, r)) {
    return i.value;
  }
  switch (e) {
    case 1:
      return o.AVERAGE(a);
    case 2:
      return o.COUNT(a);
    case 3:
      return o.COUNTA(a);
    case 4:
      return o.MAX(a);
    case 5:
      return o.MIN(a);
    case 6:
      return exports.PRODUCT(a);
    case 7:
      return o.STDEV.S(a);
    case 8:
      return o.STDEV.P(a);
    case 9:
      return exports.SUM(a);
    case 10:
      return o.VAR.S(a);
    case 11:
      return o.VAR.P(a);
    case 12:
      return o.MEDIAN(a);
    case 13:
      return o.MODE.SNGL(a);
    case 14:
      return o.LARGE(a, s);
    case 15:
      return o.SMALL(a, s);
    case 16:
      return o.PERCENTILE.INC(a, s);
    case 17:
      return o.QUARTILE.INC(a, s);
    case 18:
      return o.PERCENTILE.EXC(a, s);
    case 19:
      return o.QUARTILE.EXC(a, s);
  }
};
exports.ARABIC = function (e) {
  if (e === undefined || e === null) {
    return 0;
  }
  if (e instanceof Error) {
    return e;
  }
  if (!/^M*(?:D?C{0,3}|C[MD])(?:L?X{0,3}|X[CL])(?:V?I{0,3}|I[XV])$/.test(e)) {
    return i.value;
  }
  var t = 0;
  e.replace(/[MDLV]|C[MD]?|X[CL]?|I[XV]?/g, function (e) {
    t += {
      M: 1000,
      CM: 900,
      D: 500,
      CD: 400,
      C: 100,
      XC: 90,
      L: 50,
      XL: 40,
      X: 10,
      IX: 9,
      V: 5,
      IV: 4,
      I: 1
    }[e];
  });
  return t;
};
exports.ASIN = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var t = Math.asin(e);
  if (isNaN(t)) {
    t = i.num;
  }
  return t;
};
exports.ASINH = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return Math.log(e + Math.sqrt(e * e + 1));
  }
};
exports.ATAN = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return Math.atan(e);
  }
};
exports.ATAN2 = function (e, t) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  return r || Math.atan2(e, t);
};
exports.ATANH = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var t = Math.log((1 + e) / (1 - e)) / 2;
  if (isNaN(t)) {
    t = i.num;
  }
  return t;
};
exports.BASE = function (e, t, r) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  r = n.parseNumber(r);
  var o = n.anyError(e, t, r);
  if (o) {
    return o;
  }
  if (t === 0) {
    return i.num;
  }
  var a = e.toString(t);
  return new Array(Math.max(r + 1 - a.length, 0)).join("0") + a;
};
exports.CEILING = function (e, r, i) {
  e = n.parseNumber(e);
  r = n.parseNumber(r);
  i = n.parseNumber(i);
  var o = n.anyError(e, r, i);
  if (o) {
    return o;
  }
  if (r === 0) {
    return 0;
  }
  r = Math.abs(r);
  var a = -Math.floor(Math.log(r) / Math.log(10));
  if (e >= 0) {
    return exports.ROUND(Math.ceil(e / r) * r, a);
  } else if (i === 0) {
    return -exports.ROUND(Math.floor(Math.abs(e) / r) * r, a);
  } else {
    return -exports.ROUND(Math.ceil(Math.abs(e) / r) * r, a);
  }
};
exports.CEILING.MATH = exports.CEILING;
exports.CEILING.PRECISE = exports.CEILING;
exports.COMBIN = function (e, r) {
  e = n.parseNumber(e);
  r = n.parseNumber(r);
  var o = n.anyError(e, r);
  return o || (e < r ? i.num : exports.FACT(e) / (exports.FACT(r) * exports.FACT(e - r)));
};
exports.COMBINA = function (e, r) {
  e = n.parseNumber(e);
  r = n.parseNumber(r);
  var o = n.anyError(e, r);
  return o || (e < r ? i.num : e === 0 && r === 0 ? 1 : exports.COMBIN(e + r - 1, e - 1));
};
exports.COS = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return Math.cos(e);
  }
};
exports.COSH = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return (Math.exp(e) + Math.exp(-e)) / 2;
  }
};
exports.COT = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else if (e === 0) {
    return i.div0;
  } else {
    return 1 / Math.tan(e);
  }
};
exports.COTH = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  if (e === 0) {
    return i.div0;
  }
  var t = Math.exp(e * 2);
  return (t + 1) / (t - 1);
};
exports.CSC = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else if (e === 0) {
    return i.div0;
  } else {
    return 1 / Math.sin(e);
  }
};
exports.CSCH = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else if (e === 0) {
    return i.div0;
  } else {
    return 2 / (Math.exp(e) - Math.exp(-e));
  }
};
exports.DECIMAL = function (e, t) {
  if (arguments.length < 1) {
    return i.value;
  }
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  return r || (t === 0 ? i.num : parseInt(e, t));
};
exports.DEGREES = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return e * 180 / Math.PI;
  }
};
exports.EVEN = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return exports.CEILING(e, -2, -1);
  }
};
exports.EXP = function (e) {
  if (arguments.length < 1) {
    return i.na;
  } else if (arguments.length > 1) {
    return i.error;
  } else {
    e = n.parseNumber(e);
    if (!(e instanceof Error)) {
      e = Math.exp(e);
    }
    return e;
  }
};
var u = [];
exports.FACT = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var r = Math.floor(e);
  if (r === 0 || r === 1) {
    return 1;
  } else {
    if (!(u[r] > 0)) {
      u[r] = exports.FACT(r - 1) * r;
    }
    return u[r];
  }
};
exports.FACTDOUBLE = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var r = Math.floor(e);
  if (r <= 0) {
    return 1;
  } else {
    return r * exports.FACTDOUBLE(r - 2);
  }
};
exports.FLOOR = function (e, r) {
  e = n.parseNumber(e);
  r = n.parseNumber(r);
  var o = n.anyError(e, r);
  if (o) {
    return o;
  }
  if (r === 0) {
    return 0;
  }
  if ((!(e >= 0) || !(r > 0)) && (!(e <= 0) || !(r < 0))) {
    return i.num;
  }
  r = Math.abs(r);
  var a = -Math.floor(Math.log(r) / Math.log(10));
  if (e >= 0) {
    return exports.ROUND(Math.floor(e / r) * r, a);
  } else {
    return -exports.ROUND(Math.ceil(Math.abs(e) / r), a);
  }
};
exports.FLOOR.MATH = function (e, r, i) {
  if (r instanceof Error) {
    return r;
  }
  r = r === undefined ? 0 : r;
  e = n.parseNumber(e);
  r = n.parseNumber(r);
  i = n.parseNumber(i);
  var o = n.anyError(e, r, i);
  if (o) {
    return o;
  }
  if (r === 0) {
    return 0;
  }
  r = r ? Math.abs(r) : 1;
  var a = -Math.floor(Math.log(r) / Math.log(10));
  if (e >= 0) {
    return exports.ROUND(Math.floor(e / r) * r, a);
  } else if (i === 0 || i === undefined) {
    return -exports.ROUND(Math.ceil(Math.abs(e) / r) * r, a);
  } else {
    return -exports.ROUND(Math.floor(Math.abs(e) / r) * r, a);
  }
};
exports.FLOOR.PRECISE = exports.FLOOR.MATH;
exports.GCD = function () {
  var e = n.parseNumberArray(n.flatten(arguments));
  if (e instanceof Error) {
    return e;
  }
  for (var t = e.length, r = e[0], i = r < 0 ? -r : r, o = 1; o < t; o++) {
    var a = e[o];
    var s = a < 0 ? -a : a;
    while (i && s) {
      if (i > s) {
        i %= s;
      } else {
        s %= i;
      }
    }
    i += s;
  }
  return i;
};
exports.INT = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return Math.floor(e);
  }
};
exports.ISO = {
  CEILING: exports.CEILING
};
exports.LCM = function () {
  var e = n.parseNumberArray(n.flatten(arguments));
  if (e instanceof Error) {
    return e;
  }
  var t;
  var r;
  for (var i, o, a = 1; (i = e.pop()) !== undefined;) {
    if (i === 0) {
      return 0;
    }
    while (i > 1) {
      if (i % 2) {
        t = 3;
        r = Math.floor(Math.sqrt(i));
        for (; t <= r && i % t; t += 2);
        o = t <= r ? t : i;
      } else {
        o = 2;
      }
      i /= o;
      a *= o;
      t = e.length;
      for (; t; e[--t] % o === 0 && (e[t] /= o) === 1 && e.splice(t, 1));
    }
  }
  return a;
};
exports.LN = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else if (e === 0) {
    return i.num;
  } else {
    return Math.log(e);
  }
};
exports.LN10 = function () {
  return Math.log(10);
};
exports.LN2 = function () {
  return Math.log(2);
};
exports.LOG10E = function () {
  return Math.LOG10E;
};
exports.LOG2E = function () {
  return Math.LOG2E;
};
exports.LOG = function (e, t) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  return r || (e === 0 || t === 0 ? i.num : Math.log(e) / Math.log(t));
};
exports.LOG10 = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else if (e === 0) {
    return i.num;
  } else {
    return Math.log(e) / Math.log(10);
  }
};
exports.MOD = function (e, t) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  if (r) {
    return r;
  }
  if (t === 0) {
    return i.div0;
  }
  var o = Math.abs(e % t);
  o = e < 0 ? t - o : o;
  if (t > 0) {
    return o;
  } else {
    return -o;
  }
};
exports.MROUND = function (e, t) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  return r || (e * t === 0 ? 0 : e * t < 0 ? i.num : Math.round(e / t) * t);
};
exports.MULTINOMIAL = function () {
  var e = n.parseNumberArray(n.flatten(arguments));
  if (e instanceof Error) {
    return e;
  }
  var r = 0;
  var i = 1;
  for (var o = 0; o < e.length; o++) {
    r += e[o];
    i *= exports.FACT(e[o]);
  }
  return exports.FACT(r) / i;
};
exports.ODD = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var t = Math.ceil(Math.abs(e));
  t = t & 1 ? t : t + 1;
  if (e >= 0) {
    return t;
  } else {
    return -t;
  }
};
exports.PI = function () {
  return Math.PI;
};
exports.E = function () {
  return Math.E;
};
exports.POWER = function (e, t) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  if (r) {
    return r;
  }
  if (e === 0 && t === 0) {
    return i.num;
  }
  var o = Math.pow(e, t);
  if (isNaN(o)) {
    return i.num;
  } else {
    return o;
  }
};
exports.PRODUCT = function () {
  var e = n.flatten(arguments);
  var t = e.filter(function (e) {
    return e !== undefined && e !== null;
  });
  if (t.length === 0) {
    return 0;
  }
  var r = n.parseNumberArray(t);
  if (r instanceof Error) {
    return r;
  }
  var i = 1;
  for (var o = 0; o < r.length; o++) {
    i *= r[o];
  }
  return i;
};
exports.QUOTIENT = function (e, t) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  return r || parseInt(e / t, 10);
};
exports.RADIANS = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return e * Math.PI / 180;
  }
};
exports.RAND = function () {
  return Math.random();
};
exports.RANDBETWEEN = function (e, t) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  return r || e + Math.ceil((t - e + 1) * Math.random()) - 1;
};
exports.ROMAN = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var t = String(e).split("");
  var r = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM", "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC", "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  var i = "";
  var o = 3;
  while (o--) {
    i = (r[+t.pop() + o * 10] || "") + i;
  }
  return new Array(+t.join("") + 1).join("M") + i;
};
exports.ROUND = function (e, t) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  return r || Math.round(e * Math.pow(10, t)) / Math.pow(10, t);
};
exports.ROUNDDOWN = function (e, t) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  if (r) {
    return r;
  }
  var i = e > 0 ? 1 : -1;
  return i * Math.floor(Math.abs(e) * Math.pow(10, t)) / Math.pow(10, t);
};
exports.ROUNDUP = function (e, t) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  if (r) {
    return r;
  }
  var i = e > 0 ? 1 : -1;
  return i * Math.ceil(Math.abs(e) * Math.pow(10, t)) / Math.pow(10, t);
};
exports.SEC = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return 1 / Math.cos(e);
  }
};
exports.SECH = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return 2 / (Math.exp(e) + Math.exp(-e));
  }
};
exports.SERIESSUM = function (e, t, r, o) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  r = n.parseNumber(r);
  o = n.parseNumberArray(o);
  if (n.anyIsError(e, t, r, o)) {
    return i.value;
  }
  var a = o[0] * Math.pow(e, t);
  for (var s = 1; s < o.length; s++) {
    a += o[s] * Math.pow(e, t + s * r);
  }
  return a;
};
exports.SIGN = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else if (e < 0) {
    return -1;
  } else if (e === 0) {
    return 0;
  } else {
    return 1;
  }
};
exports.SIN = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return Math.sin(e);
  }
};
exports.SINH = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return (Math.exp(e) - Math.exp(-e)) / 2;
  }
};
exports.SQRT = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else if (e < 0) {
    return i.num;
  } else {
    return Math.sqrt(e);
  }
};
exports.SQRTPI = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return Math.sqrt(e * Math.PI);
  }
};
exports.SQRT1_2 = function () {
  return 1 / Math.sqrt(2);
};
exports.SQRT2 = function () {
  return Math.sqrt(2);
};
exports.SUBTOTAL = function (e, r) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  switch (e) {
    case 1:
      return o.AVERAGE(r);
    case 2:
      return o.COUNT(r);
    case 3:
      return o.COUNTA(r);
    case 4:
      return o.MAX(r);
    case 5:
      return o.MIN(r);
    case 6:
      return exports.PRODUCT(r);
    case 7:
      return o.STDEV.S(r);
    case 8:
      return o.STDEV.P(r);
    case 9:
      return exports.SUM(r);
    case 10:
      return o.VAR.S(r);
    case 11:
      return o.VAR.P(r);
    case 101:
      return o.AVERAGE(r);
    case 102:
      return o.COUNT(r);
    case 103:
      return o.COUNTA(r);
    case 104:
      return o.MAX(r);
    case 105:
      return o.MIN(r);
    case 106:
      return exports.PRODUCT(r);
    case 107:
      return o.STDEV.S(r);
    case 108:
      return o.STDEV.P(r);
    case 109:
      return exports.SUM(r);
    case 110:
      return o.VAR.S(r);
    case 111:
      return o.VAR.P(r);
  }
};
exports.ADD = function (e, t) {
  if (arguments.length !== 2) {
    return i.na;
  }
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  return r || e + t;
};
exports.MINUS = function (e, t) {
  if (arguments.length !== 2) {
    return i.na;
  }
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  return r || e - t;
};
exports.DIVIDE = function (e, t) {
  if (arguments.length !== 2) {
    return i.na;
  }
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  return r || (t === 0 ? i.div0 : e / t);
};
exports.MULTIPLY = function (e, t) {
  if (arguments.length !== 2) {
    return i.na;
  }
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  return r || e * t;
};
exports.GT = function (e, t) {
  if (arguments.length !== 2) {
    return i.na;
  }
  if (e instanceof Error) {
    return e;
  }
  if (t instanceof Error) {
    return t;
  }
  if (n.anyIsString(e, t)) {
    e = n.parseString(e);
    t = n.parseString(t);
  } else {
    e = n.parseNumber(e);
    t = n.parseNumber(t);
  }
  var r = n.anyError(e, t);
  return r || e > t;
};
exports.GTE = function (e, t) {
  if (arguments.length !== 2) {
    return i.na;
  }
  if (n.anyIsString(e, t)) {
    e = n.parseString(e);
    t = n.parseString(t);
  } else {
    e = n.parseNumber(e);
    t = n.parseNumber(t);
  }
  var r = n.anyError(e, t);
  return r || e >= t;
};
exports.LT = function (e, t) {
  if (arguments.length !== 2) {
    return i.na;
  }
  if (n.anyIsString(e, t)) {
    e = n.parseString(e);
    t = n.parseString(t);
  } else {
    e = n.parseNumber(e);
    t = n.parseNumber(t);
  }
  var r = n.anyError(e, t);
  return r || e < t;
};
exports.LTE = function (e, t) {
  if (arguments.length !== 2) {
    return i.na;
  }
  if (n.anyIsString(e, t)) {
    e = n.parseString(e);
    t = n.parseString(t);
  } else {
    e = n.parseNumber(e);
    t = n.parseNumber(t);
  }
  var r = n.anyError(e, t);
  return r || e <= t;
};
exports.EQ = function (e, t) {
  if (arguments.length !== 2) {
    return i.na;
  } else if (e instanceof Error) {
    return e;
  } else if (t instanceof Error) {
    return t;
  } else {
    if (e === null) {
      e = undefined;
    }
    if (t === null) {
      t = undefined;
    }
    return e === t;
  }
};
exports.NE = function (e, t) {
  if (arguments.length !== 2) {
    return i.na;
  } else if (e instanceof Error) {
    return e;
  } else if (t instanceof Error) {
    return t;
  } else {
    if (e === null) {
      e = undefined;
    }
    if (t === null) {
      t = undefined;
    }
    return e !== t;
  }
};
exports.POW = function (e, r) {
  if (arguments.length !== 2) {
    return i.na;
  } else {
    return exports.POWER(e, r);
  }
};
exports.SUM = function () {
  var e = 0;
  n.arrayEach(n.argsToArray(arguments), function (r) {
    if (e instanceof Error) {
      return false;
    }
    if (r instanceof Error) {
      e = r;
    } else if (typeof r === "number") {
      e += r;
    } else if (typeof r === "string") {
      var n = parseFloat(r);
      if (!isNaN(n)) {
        e += n;
      }
    } else if (Array.isArray(r)) {
      var i = exports.SUM.apply(null, r);
      if (i instanceof Error) {
        e = i;
      } else {
        e += i;
      }
    }
  });
  return e;
};
exports.SUMIF = function (e, t, r) {
  e = n.flatten(e);
  r = r ? n.flatten(r) : e;
  if (e instanceof Error) {
    return e;
  }
  if (t === undefined || t === null || t instanceof Error) {
    return 0;
  }
  var i = 0;
  var o = t === "*";
  var a = o ? null : s.parse(t + "");
  for (var u = 0; u < e.length; u++) {
    var l = e[u];
    var c = r[u];
    if (o) {
      i += l;
    } else {
      var p = [s.createToken(l, s.TOKEN_TYPE_LITERAL)].concat(a);
      i += s.compute(p) ? c : 0;
    }
  }
  return i;
};
exports.SUMIFS = function () {
  var e = n.argsToArray(arguments);
  var t = n.parseNumberArray(n.flatten(e.shift()));
  if (t instanceof Error) {
    return t;
  }
  var r = e;
  for (var i = r.length / 2, o = 0; o < i; o++) {
    r[o * 2] = n.flatten(r[o * 2]);
  }
  var a = 0;
  for (o = 0; o < t.length; o++) {
    var u = false;
    for (var l = 0; l < i; l++) {
      var c = r[l * 2][o];
      var p = r[l * 2 + 1];
      var d = p === undefined || p === "*";
      var f = false;
      if (d) {
        f = true;
      } else {
        var g = s.parse(p + "");
        var m = [s.createToken(c, s.TOKEN_TYPE_LITERAL)].concat(g);
        f = s.compute(m);
      }
      if (!f) {
        u = false;
        break;
      }
      u = true;
    }
    if (u) {
      a += t[o];
    }
  }
  return a;
};
exports.SUMPRODUCT = function () {
  if (!arguments || arguments.length === 0) {
    return i.value;
  }
  var e;
  var t;
  var r;
  var o;
  var a = arguments.length + 1;
  var s = 0;
  for (var u = 0; u < arguments[0].length; u++) {
    if (arguments[0][u] instanceof Array) {
      for (var l = 0; l < arguments[0][u].length; l++) {
        e = 1;
        t = 1;
        for (; t < a; t++) {
          var c = arguments[t - 1][u][l];
          if (c instanceof Error) {
            return c;
          }
          o = n.parseNumber(c);
          if (o instanceof Error) {
            return o;
          }
          e *= o;
        }
        s += e;
      }
    } else {
      e = 1;
      t = 1;
      for (; t < a; t++) {
        var p = arguments[t - 1][u];
        if (p instanceof Error) {
          return p;
        }
        r = n.parseNumber(p);
        if (r instanceof Error) {
          return r;
        }
        e *= r;
      }
      s += e;
    }
  }
  return s;
};
exports.SUMSQ = function () {
  var e = n.parseNumberArray(n.flatten(arguments));
  if (e instanceof Error) {
    return e;
  }
  var t = 0;
  for (var r = e.length, i = 0; i < r; i++) {
    t += a.ISNUMBER(e[i]) ? e[i] * e[i] : 0;
  }
  return t;
};
exports.SUMX2MY2 = function (e, t) {
  e = n.parseNumberArray(n.flatten(e));
  t = n.parseNumberArray(n.flatten(t));
  if (n.anyIsError(e, t)) {
    return i.value;
  }
  var r = 0;
  for (var o = 0; o < e.length; o++) {
    r += e[o] * e[o] - t[o] * t[o];
  }
  return r;
};
exports.SUMX2PY2 = function (e, t) {
  e = n.parseNumberArray(n.flatten(e));
  t = n.parseNumberArray(n.flatten(t));
  if (n.anyIsError(e, t)) {
    return i.value;
  }
  var r = 0;
  e = n.parseNumberArray(n.flatten(e));
  t = n.parseNumberArray(n.flatten(t));
  for (var o = 0; o < e.length; o++) {
    r += e[o] * e[o] + t[o] * t[o];
  }
  return r;
};
exports.SUMXMY2 = function (e, t) {
  e = n.parseNumberArray(n.flatten(e));
  t = n.parseNumberArray(n.flatten(t));
  if (n.anyIsError(e, t)) {
    return i.value;
  }
  var r = 0;
  e = n.flatten(e);
  t = n.flatten(t);
  for (var o = 0; o < e.length; o++) {
    r += Math.pow(e[o] - t[o], 2);
  }
  return r;
};
exports.TAN = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return Math.tan(e);
  }
};
exports.TANH = function (e) {
  e = n.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var t = Math.exp(e * 2);
  return (t - 1) / (t + 1);
};
exports.TRUNC = function (e, t) {
  e = n.parseNumber(e);
  t = n.parseNumber(t);
  var r = n.anyError(e, t);
  if (r) {
    return r;
  }
  var i = e > 0 ? 1 : -1;
  return i * Math.floor(Math.abs(e) * Math.pow(10, t)) / Math.pow(10, t);
};
};
