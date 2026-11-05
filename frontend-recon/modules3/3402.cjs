// webpack module 3402 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./8185.js");
var i = require("./21523.js");
var o = require("./74617.js");
var a = require("./83721.js");
var s = require("./70836.js");
var u = require("./60511.js");
var l = require("./32755.js");
var c = 2.5066282746310002;
exports.AVEDEV = function () {
  var e = a.flatten(arguments);
  var t = e.filter(a.isDefined);
  if (t.length === 0) {
    return u.num;
  }
  var r = a.parseNumberArray(t);
  if (r instanceof Error) {
    return r;
  } else {
    return o.sum(o(r).subtract(o.mean(r)).abs()[0]) / r.length;
  }
};
exports.AVERAGE = function () {
  var e = a.flatten(arguments);
  var t = e.filter(a.isDefined);
  if (t.length === 0) {
    return u.div0;
  }
  var r = a.anyError.apply(undefined, t);
  if (r) {
    return r;
  }
  var n;
  var i = a.numbers(t);
  for (var o = i.length, s = 0, l = 0, c = 0; c < o; c++) {
    s += i[c];
    l += 1;
  }
  n = s / l;
  if (isNaN(n)) {
    n = u.num;
  }
  return n;
};
exports.AVERAGEA = function () {
  var e = a.flatten(arguments);
  var t = e.filter(a.isDefined);
  if (t.length === 0) {
    return u.div0;
  }
  var r = a.anyError.apply(undefined, t);
  if (r) {
    return r;
  }
  var n;
  var i = t;
  for (var o = i.length, s = 0, l = 0, c = 0; c < o; c++) {
    var p = i[c];
    if (typeof p === "number") {
      s += p;
    }
    if (p === true) {
      s++;
    }
    if (p !== null) {
      l++;
    }
  }
  n = s / l;
  if (isNaN(n)) {
    n = u.num;
  }
  return n;
};
exports.AVERAGEIF = function (e, t, r) {
  if (arguments.length <= 1) {
    return u.na;
  }
  r = r || e;
  var n = a.flatten(r);
  var i = n.filter(a.isDefined);
  r = a.parseNumberArray(i);
  e = a.flatten(e);
  if (r instanceof Error) {
    return r;
  }
  var o = 0;
  var l = 0;
  var c = t === undefined || t === "*";
  var p = c ? null : s.parse(t + "");
  for (var d = 0; d < e.length; d++) {
    var f = e[d];
    if (c) {
      l += r[d];
      o++;
    } else {
      var g = [s.createToken(f, s.TOKEN_TYPE_LITERAL)].concat(p);
      if (s.compute(g)) {
        l += r[d];
        o++;
      }
    }
  }
  return l / o;
};
exports.AVERAGEIFS = function () {
  var e = a.argsToArray(arguments);
  var t = (e.length - 1) / 2;
  for (var r = a.flatten(e[0]), n = 0, i = 0, o = 0; o < r.length; o++) {
    var u = false;
    for (var l = 0; l < t; l++) {
      var c = e[l * 2 + 1][o];
      var p = e[l * 2 + 2];
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
      i += r[o];
      n++;
    }
  }
  var v = i / n;
  if (isNaN(v)) {
    return 0;
  } else {
    return v;
  }
};
exports.BETA = {};
exports.BETA.DIST = function (e, t, r, n, i, s) {
  if (arguments.length < 4) {
    return u.value;
  } else {
    i = i === undefined ? 0 : i;
    s = s === undefined ? 1 : s;
    e = a.parseNumber(e);
    t = a.parseNumber(t);
    r = a.parseNumber(r);
    i = a.parseNumber(i);
    s = a.parseNumber(s);
    if (a.anyIsError(e, t, r, i, s)) {
      return u.value;
    } else {
      e = (e - i) / (s - i);
      if (n) {
        return o.beta.cdf(e, t, r);
      } else {
        return o.beta.pdf(e, t, r);
      }
    }
  }
};
exports.BETA.INV = function (e, t, r, n, i) {
  n = n === undefined ? 0 : n;
  i = i === undefined ? 1 : i;
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  n = a.parseNumber(n);
  i = a.parseNumber(i);
  if (a.anyIsError(e, t, r, n, i)) {
    return u.value;
  } else {
    return o.beta.inv(e, t, r) * (i - n) + n;
  }
};
exports.BINOM = {};
exports.BINOM.DIST = function (e, t, r, n) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  n = a.parseNumber(n);
  if (a.anyIsError(e, t, r, n)) {
    return u.value;
  } else if (n) {
    return o.binomial.cdf(e, t, r);
  } else {
    return o.binomial.pdf(e, t, r);
  }
};
exports.BINOM.DIST.RANGE = function (e, t, r, i) {
  i = i === undefined ? r : i;
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  i = a.parseNumber(i);
  if (a.anyIsError(e, t, r, i)) {
    return u.value;
  }
  var o = 0;
  for (var s = r; s <= i; s++) {
    o += n.COMBIN(e, s) * Math.pow(t, s) * Math.pow(1 - t, e - s);
  }
  return o;
};
exports.BINOM.INV = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  }
  var n = 0;
  while (n <= e) {
    if (o.binomial.cdf(n, e, t) >= r) {
      return n;
    }
    n++;
  }
};
exports.CHISQ = {};
exports.CHISQ.DIST = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return u.value;
  } else if (r) {
    return o.chisquare.cdf(e, t);
  } else {
    return o.chisquare.pdf(e, t);
  }
};
exports.CHISQ.DIST.RT = function (e, t) {
  if (!e | !t) {
    return u.na;
  } else if (e < 1 || t > Math.pow(10, 10)) {
    return u.num;
  } else if (typeof e !== "number" || typeof t !== "number") {
    return u.value;
  } else {
    return 1 - o.chisquare.cdf(e, t);
  }
};
exports.CHISQ.INV = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return u.value;
  } else {
    return o.chisquare.inv(e, t);
  }
};
exports.CHISQ.INV.RT = function (e, t) {
  if (!e | !t) {
    return u.na;
  } else if (e < 0 || e > 1 || t < 1 || t > Math.pow(10, 10)) {
    return u.num;
  } else if (typeof e !== "number" || typeof t !== "number") {
    return u.value;
  } else {
    return o.chisquare.inv(1 - e, t);
  }
};
exports.CHISQ.TEST = function (e, t) {
  if (arguments.length !== 2) {
    return u.na;
  }
  if (!(e instanceof Array) || !(t instanceof Array)) {
    return u.value;
  }
  if (e.length !== t.length) {
    return u.value;
  }
  if (e[0] && t[0] && e[0].length !== t[0].length) {
    return u.value;
  }
  var r;
  var n;
  var i;
  var o = e.length;
  for (n = 0; n < o; n++) {
    if (!(e[n] instanceof Array)) {
      r = e[n];
      e[n] = [];
      e[n].push(r);
    }
    if (!(t[n] instanceof Array)) {
      r = t[n];
      t[n] = [];
      t[n].push(r);
    }
  }
  var a = e[0].length;
  var s = a === 1 ? o - 1 : (o - 1) * (a - 1);
  var l = 0;
  var c = Math.PI;
  for (n = 0; n < o; n++) {
    for (i = 0; i < a; i++) {
      l += Math.pow(e[n][i] - t[n][i], 2) / t[n][i];
    }
  }
  function p(e, t) {
    var r = Math.exp(e * -0.5);
    if (t % 2 === 1) {
      r *= Math.sqrt(e * 2 / c);
    }
    var n = t;
    while (n >= 2) {
      r = r * e / n;
      n -= 2;
    }
    var i = r;
    var o = t;
    while (i > r * 1e-10) {
      o += 2;
      i = i * e / o;
      r += i;
    }
    return 1 - r;
  }
  return Math.round(p(l, s) * 1000000) / 1000000;
};
exports.COLUMN = function (e, t) {
  if (arguments.length !== 2) {
    return u.na;
  } else if (t < 0) {
    return u.num;
  } else if (e instanceof Array && typeof t === "number") {
    if (e.length !== 0) {
      return o.col(e, t);
    } else {
      return undefined;
    }
  } else {
    return u.value;
  }
};
exports.COLUMNS = function (e) {
  if (arguments.length !== 1) {
    return u.na;
  } else if (e instanceof Array) {
    if (e.length === 0) {
      return 0;
    } else {
      return o.cols(e);
    }
  } else {
    return u.value;
  }
};
exports.CONFIDENCE = {};
exports.CONFIDENCE.NORM = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  } else {
    return o.normalci(1, e, t, r)[1] - 1;
  }
};
exports.CONFIDENCE.T = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  } else {
    return o.tci(1, e, t, r)[1] - 1;
  }
};
exports.CORREL = function (e, t) {
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumberArray(a.flatten(t));
  if (a.anyIsError(e, t)) {
    return u.value;
  } else {
    return o.corrcoeff(e, t);
  }
};
exports.COUNT = function () {
  var e = a.flatten(arguments);
  return a.numbers(e).length;
};
exports.COUNTA = function () {
  var e = a.flatten(arguments);
  return e.length - exports.COUNTBLANK(e);
};
exports.COUNTIN = function (e, t) {
  var r = 0;
  e = a.flatten(e);
  for (var n = 0; n < e.length; n++) {
    if (e[n] === t) {
      r++;
    }
  }
  return r;
};
exports.COUNTBLANK = function () {
  var e;
  for (var t = a.flatten(arguments), r = 0, n = 0; n < t.length; n++) {
    e = t[n];
    if (e === undefined || e === null || e === "") {
      r++;
    }
  }
  return r;
};
exports.COUNTIF = function (e, t) {
  e = a.flatten(e);
  var r = t === undefined || t === "*";
  if (r) {
    return e.length;
  }
  var n = 0;
  var i = s.parse(t + "");
  for (var o = 0; o < e.length; o++) {
    var u = e[o];
    var l = [s.createToken(u, s.TOKEN_TYPE_LITERAL)].concat(i);
    if (s.compute(l)) {
      n++;
    }
  }
  return n;
};
exports.COUNTIFS = function () {
  var e = a.argsToArray(arguments);
  for (var t = new Array(a.flatten(e[0]).length), r = 0; r < t.length; r++) {
    t[r] = true;
  }
  for (r = 0; r < e.length; r += 2) {
    var n = a.flatten(e[r]);
    var i = e[r + 1];
    var o = i === undefined || i === "*";
    if (!o) {
      var u = s.parse(i + "");
      for (var l = 0; l < n.length; l++) {
        var c = n[l];
        var p = [s.createToken(c, s.TOKEN_TYPE_LITERAL)].concat(u);
        t[l] = t[l] && s.compute(p);
      }
    }
  }
  var d = 0;
  for (r = 0; r < t.length; r++) {
    if (t[r]) {
      d++;
    }
  }
  return d;
};
exports.COUNTUNIQUE = function () {
  return l.UNIQUE.apply(null, a.flatten(arguments)).length;
};
exports.COVARIANCE = {};
exports.COVARIANCE.P = function (e, t) {
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumberArray(a.flatten(t));
  if (a.anyIsError(e, t)) {
    return u.value;
  }
  var r = o.mean(e);
  var n = o.mean(t);
  var i = 0;
  for (var s = e.length, l = 0; l < s; l++) {
    i += (e[l] - r) * (t[l] - n);
  }
  return i / s;
};
exports.COVARIANCE.S = function (e, t) {
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumberArray(a.flatten(t));
  if (a.anyIsError(e, t)) {
    return u.value;
  } else {
    return o.covariance(e, t);
  }
};
exports.DEVSQ = function () {
  var e = a.parseNumberArray(a.flatten(arguments));
  if (e instanceof Error) {
    return e;
  }
  var t = o.mean(e);
  var r = 0;
  for (var n = 0; n < e.length; n++) {
    r += Math.pow(e[n] - t, 2);
  }
  return r;
};
exports.EXPON = {};
exports.EXPON.DIST = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return u.value;
  } else if (r) {
    return o.exponential.cdf(e, t);
  } else {
    return o.exponential.pdf(e, t);
  }
};
exports.F = {};
exports.F.DIST = function (e, t, r, n) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  } else if (n) {
    return o.centralF.cdf(e, t, r);
  } else {
    return o.centralF.pdf(e, t, r);
  }
};
exports.F.DIST.RT = function (e, t, r) {
  if (arguments.length !== 3) {
    return u.na;
  } else if (e < 0 || t < 1 || r < 1) {
    return u.num;
  } else if (typeof e !== "number" || typeof t !== "number" || typeof r !== "number") {
    return u.value;
  } else {
    return 1 - o.centralF.cdf(e, t, r);
  }
};
exports.F.INV = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  } else if (e <= 0 || e > 1) {
    return u.num;
  } else {
    return o.centralF.inv(e, t, r);
  }
};
exports.F.INV.RT = function (e, t, r) {
  if (arguments.length !== 3) {
    return u.na;
  } else if (e < 0 || e > 1 || t < 1 || t > Math.pow(10, 10) || r < 1 || r > Math.pow(10, 10)) {
    return u.num;
  } else if (typeof e !== "number" || typeof t !== "number" || typeof r !== "number") {
    return u.value;
  } else {
    return o.centralF.inv(1 - e, t, r);
  }
};
exports.F.TEST = function (e, t) {
  if (!e || !t) {
    return u.na;
  }
  if (!(e instanceof Array) || !(t instanceof Array)) {
    return u.na;
  }
  if (e.length < 2 || t.length < 2) {
    return u.div0;
  }
  function r(e, t) {
    var r = 0;
    for (var n = 0; n < e.length; n++) {
      r += Math.pow(e[n] - t, 2);
    }
    return r;
  }
  var i = n.SUM(e) / e.length;
  var o = n.SUM(t) / t.length;
  var a = r(e, i) / (e.length - 1);
  var s = r(t, o) / (t.length - 1);
  return a / s;
};
exports.FISHER = function (e) {
  e = a.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return Math.log((1 + e) / (1 - e)) / 2;
  }
};
exports.FISHERINV = function (e) {
  e = a.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var t = Math.exp(e * 2);
  return (t - 1) / (t + 1);
};
exports.FORECAST = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumberArray(a.flatten(t));
  r = a.parseNumberArray(a.flatten(r));
  if (a.anyIsError(e, t, r)) {
    return u.value;
  }
  var n = o.mean(r);
  var i = o.mean(t);
  for (var s = r.length, l = 0, c = 0, p = 0; p < s; p++) {
    l += (r[p] - n) * (t[p] - i);
    c += Math.pow(r[p] - n, 2);
  }
  var d = l / c;
  var f = i - d * n;
  return f + d * e;
};
exports.FREQUENCY = function (e, t) {
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumberArray(a.flatten(t));
  if (a.anyIsError(e, t)) {
    return u.value;
  }
  var r = e.length;
  for (var n = t.length, i = [], o = 0; o <= n; o++) {
    i[o] = 0;
    for (var s = 0; s < r; s++) {
      if (o === 0) {
        if (e[s] <= t[0]) {
          i[0] += 1;
        }
      } else if (o < n) {
        if (e[s] > t[o - 1] && e[s] <= t[o]) {
          i[o] += 1;
        }
      } else if (o === n && e[s] > t[n - 1]) {
        i[n] += 1;
      }
    }
  }
  return i;
};
exports.GAMMA = function (e) {
  e = a.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else if (e === 0 || parseInt(e, 10) === e && e < 0) {
    return u.num;
  } else {
    return o.gammafn(e);
  }
};
exports.GAMMA.DIST = function (e, t, r, n) {
  if (arguments.length !== 4) {
    return u.na;
  } else if (e < 0 || t <= 0 || r <= 0 || typeof e !== "number" || typeof t !== "number" || typeof r !== "number") {
    return u.value;
  } else if (n) {
    return o.gamma.cdf(e, t, r, true);
  } else {
    return o.gamma.pdf(e, t, r, false);
  }
};
exports.GAMMA.INV = function (e, t, r) {
  if (arguments.length !== 3) {
    return u.na;
  } else if (e < 0 || e > 1 || t <= 0 || r <= 0) {
    return u.num;
  } else if (typeof e !== "number" || typeof t !== "number" || typeof r !== "number") {
    return u.value;
  } else {
    return o.gamma.inv(e, t, r);
  }
};
exports.GAMMALN = function (e) {
  e = a.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return o.gammaln(e);
  }
};
exports.GAMMALN.PRECISE = function (e) {
  if (arguments.length !== 1) {
    return u.na;
  } else if (e <= 0) {
    return u.num;
  } else if (typeof e !== "number") {
    return u.value;
  } else {
    return o.gammaln(e);
  }
};
exports.GAUSS = function (e) {
  e = a.parseNumber(e);
  if (e instanceof Error) {
    return e;
  } else {
    return o.normal.cdf(e, 0, 1) - 0.5;
  }
};
exports.GEOMEAN = function () {
  var e = a.parseNumberArray(a.flatten(arguments));
  if (e instanceof Error) {
    return e;
  } else {
    return o.geomean(e);
  }
};
exports.GROWTH = function (e, t, r, n) {
  e = a.parseNumberArray(e);
  if (e instanceof Error) {
    return e;
  }
  var i;
  if (t === undefined) {
    t = [];
    i = 1;
    for (; i <= e.length; i++) {
      t.push(i);
    }
  }
  if (r === undefined) {
    r = [];
    i = 1;
    for (; i <= e.length; i++) {
      r.push(i);
    }
  }
  t = a.parseNumberArray(t);
  r = a.parseNumberArray(r);
  if (a.anyIsError(t, r)) {
    return u.value;
  }
  if (n === undefined) {
    n = true;
  }
  var o;
  var s;
  var l = e.length;
  var c = 0;
  var p = 0;
  var d = 0;
  var f = 0;
  for (i = 0; i < l; i++) {
    var g = t[i];
    var m = Math.log(e[i]);
    c += g;
    p += m;
    d += g * m;
    f += g * g;
  }
  c /= l;
  p /= l;
  d /= l;
  f /= l;
  if (n) {
    o = (d - c * p) / (f - c * c);
    s = p - o * c;
  } else {
    o = d / f;
    s = 0;
  }
  var v = [];
  for (i = 0; i < r.length; i++) {
    v.push(Math.exp(s + o * r[i]));
  }
  return v;
};
exports.HARMEAN = function () {
  var e = a.parseNumberArray(a.flatten(arguments));
  if (e instanceof Error) {
    return e;
  }
  for (var t = e.length, r = 0, n = 0; n < t; n++) {
    r += 1 / e[n];
  }
  return t / r;
};
exports.HYPGEOM = {};
exports.HYPGEOM.DIST = function (e, t, r, i, o) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  i = a.parseNumber(i);
  if (a.anyIsError(e, t, r, i)) {
    return u.value;
  }
  function s(e, t, r, i) {
    return n.COMBIN(r, e) * n.COMBIN(i - r, t - e) / n.COMBIN(i, t);
  }
  function l(e, t, r, n) {
    var i = 0;
    for (var o = 0; o <= e; o++) {
      i += s(o, t, r, n);
    }
    return i;
  }
  if (o) {
    return l(e, t, r, i);
  } else {
    return s(e, t, r, i);
  }
};
exports.INTERCEPT = function (e, r) {
  e = a.parseNumberArray(e);
  r = a.parseNumberArray(r);
  if (a.anyIsError(e, r)) {
    return u.value;
  } else if (e.length !== r.length) {
    return u.na;
  } else {
    return exports.FORECAST(0, e, r);
  }
};
exports.KURT = function () {
  var e = a.parseNumberArray(a.flatten(arguments));
  if (e instanceof Error) {
    return e;
  }
  var t = o.mean(e);
  for (var r = e.length, n = 0, i = 0; i < r; i++) {
    n += Math.pow(e[i] - t, 4);
  }
  n /= Math.pow(o.stdev(e, true), 4);
  return r * (r + 1) / ((r - 1) * (r - 2) * (r - 3)) * n - (r - 1) * 3 * (r - 1) / ((r - 2) * (r - 3));
};
exports.LARGE = function (e, t) {
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return e;
  } else if (t < 0 || e.length < t) {
    return u.value;
  } else {
    return e.sort(function (e, t) {
      return t - e;
    })[t - 1];
  }
};
exports.LINEST = function (e, t) {
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumberArray(a.flatten(t));
  if (a.anyIsError(e, t)) {
    return u.value;
  }
  var r = o.mean(e);
  var n = o.mean(t);
  for (var i = t.length, s = 0, l = 0, c = 0; c < i; c++) {
    s += (t[c] - n) * (e[c] - r);
    l += Math.pow(t[c] - n, 2);
  }
  var p = s / l;
  var d = r - p * n;
  return [p, d];
};
exports.LOGEST = function (e, r) {
  e = a.parseNumberArray(a.flatten(e));
  r = a.parseNumberArray(a.flatten(r));
  if (a.anyIsError(e, r)) {
    return u.value;
  }
  for (var n = 0; n < e.length; n++) {
    e[n] = Math.log(e[n]);
  }
  var i = exports.LINEST(e, r);
  i[0] = Math.round(Math.exp(i[0]) * 1000000) / 1000000;
  i[1] = Math.round(Math.exp(i[1]) * 1000000) / 1000000;
  return i;
};
exports.LOGNORM = {};
exports.LOGNORM.DIST = function (e, t, r, n) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  } else if (n) {
    return o.lognormal.cdf(e, t, r);
  } else {
    return o.lognormal.pdf(e, t, r);
  }
};
exports.LOGNORM.INV = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  } else {
    return o.lognormal.inv(e, t, r);
  }
};
exports.MAX = function () {
  var e = a.flatten(arguments);
  var t = a.anyError.apply(undefined, e);
  if (t) {
    return t;
  }
  var r = a.numbers(e);
  if (r.length === 0) {
    return 0;
  } else {
    return Math.max.apply(Math, r);
  }
};
exports.MAXA = function () {
  var e = a.flatten(arguments);
  var t = a.anyError.apply(undefined, e);
  if (t) {
    return t;
  }
  var r = a.arrayValuesToNumbers(e);
  r = r.map(function (e) {
    if (e === undefined || e === null) {
      return 0;
    } else {
      return e;
    }
  });
  if (r.length === 0) {
    return 0;
  } else {
    return Math.max.apply(Math, r);
  }
};
exports.MEDIAN = function () {
  var e = a.flatten(arguments);
  var t = a.anyError.apply(undefined, e);
  if (t) {
    return t;
  }
  var r = a.arrayValuesToNumbers(e);
  var n = o.median(r);
  if (isNaN(n)) {
    n = u.num;
  }
  return n;
};
exports.MIN = function () {
  var e = a.flatten(arguments);
  var t = a.anyError.apply(undefined, e);
  if (t) {
    return t;
  }
  var r = a.numbers(e);
  if (r.length === 0) {
    return 0;
  } else {
    return Math.min.apply(Math, r);
  }
};
exports.MINA = function () {
  var e = a.flatten(arguments);
  var t = a.anyError.apply(undefined, e);
  if (t) {
    return t;
  }
  var r = a.arrayValuesToNumbers(e);
  r = r.map(function (e) {
    if (e === undefined || e === null) {
      return 0;
    } else {
      return e;
    }
  });
  if (r.length === 0) {
    return 0;
  } else {
    return Math.min.apply(Math, r);
  }
};
exports.MODE = {};
exports.MODE.MULT = function () {
  var e = a.parseNumberArray(a.flatten(arguments));
  if (e instanceof Error) {
    return e;
  }
  var t;
  for (var r = e.length, n = {}, i = [], o = 0, s = 0; s < r; s++) {
    t = e[s];
    n[t] = n[t] ? n[t] + 1 : 1;
    if (n[t] > o) {
      o = n[t];
      i = [];
    }
    if (n[t] === o) {
      i[i.length] = t;
    }
  }
  return i;
};
exports.MODE.SNGL = function () {
  var e = a.parseNumberArray(a.flatten(arguments));
  if (e instanceof Error) {
    return e;
  } else {
    return exports.MODE.MULT(e).sort(function (e, t) {
      return e - t;
    })[0];
  }
};
exports.NEGBINOM = {};
exports.NEGBINOM.DIST = function (e, t, r, n) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  } else if (n) {
    return o.negbin.cdf(e, t, r);
  } else {
    return o.negbin.pdf(e, t, r);
  }
};
exports.NORM = {};
exports.NORM.DIST = function (e, t, r, n) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  } else if (r <= 0) {
    return u.num;
  } else if (n) {
    return o.normal.cdf(e, t, r);
  } else {
    return o.normal.pdf(e, t, r);
  }
};
exports.NORM.INV = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  } else {
    return o.normal.inv(e, t, r);
  }
};
exports.NORM.S = {};
exports.NORM.S.DIST = function (e, t) {
  e = a.parseNumber(e);
  if (e instanceof Error) {
    return u.value;
  } else if (t) {
    return o.normal.cdf(e, 0, 1);
  } else {
    return o.normal.pdf(e, 0, 1);
  }
};
exports.NORM.S.INV = function (e) {
  e = a.parseNumber(e);
  if (e instanceof Error) {
    return u.value;
  } else {
    return o.normal.inv(e, 0, 1);
  }
};
exports.PEARSON = function (e, t) {
  t = a.parseNumberArray(a.flatten(t));
  e = a.parseNumberArray(a.flatten(e));
  if (a.anyIsError(t, e)) {
    return u.value;
  }
  var r = o.mean(e);
  var n = o.mean(t);
  for (var i = e.length, s = 0, l = 0, c = 0, p = 0; p < i; p++) {
    s += (e[p] - r) * (t[p] - n);
    l += Math.pow(e[p] - r, 2);
    c += Math.pow(t[p] - n, 2);
  }
  return s / Math.sqrt(l * c);
};
exports.PERCENTILE = {};
exports.PERCENTILE.EXC = function (e, t) {
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return u.value;
  }
  e = e.sort(function (e, t) {
    return e - t;
  });
  var r = e.length;
  if (t < 1 / (r + 1) || t > 1 - 1 / (r + 1)) {
    return u.num;
  }
  var n = t * (r + 1) - 1;
  var i = Math.floor(n);
  return a.cleanFloat(n === i ? e[n] : e[i] + (n - i) * (e[i + 1] - e[i]));
};
exports.PERCENTILE.INC = function (e, t) {
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return u.value;
  }
  e = e.sort(function (e, t) {
    return e - t;
  });
  var r = e.length;
  var n = t * (r - 1);
  var i = Math.floor(n);
  return a.cleanFloat(n === i ? e[n] : e[i] + (n - i) * (e[i + 1] - e[i]));
};
exports.PERCENTRANK = {};
exports.PERCENTRANK.EXC = function (e, t, r) {
  r = r === undefined ? 3 : r;
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  }
  e = e.sort(function (e, t) {
    return e - t;
  });
  var n = l.UNIQUE.apply(null, e);
  var i = e.length;
  var o = n.length;
  var s = Math.pow(10, r);
  var c = 0;
  var p = false;
  var d = 0;
  while (!p && d < o) {
    if (t === n[d]) {
      c = (e.indexOf(n[d]) + 1) / (i + 1);
      p = true;
    } else if (t >= n[d] && (t < n[d + 1] || d === o - 1)) {
      c = (e.indexOf(n[d]) + 1 + (t - n[d]) / (n[d + 1] - n[d])) / (i + 1);
      p = true;
    }
    d++;
  }
  return Math.floor(c * s) / s;
};
exports.PERCENTRANK.INC = function (e, t, r) {
  r = r === undefined ? 3 : r;
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  }
  e = e.sort(function (e, t) {
    return e - t;
  });
  var n = l.UNIQUE.apply(null, e);
  var i = e.length;
  var o = n.length;
  var s = Math.pow(10, r);
  var c = 0;
  var p = false;
  var d = 0;
  while (!p && d < o) {
    if (t === n[d]) {
      c = e.indexOf(n[d]) / (i - 1);
      p = true;
    } else if (t >= n[d] && (t < n[d + 1] || d === o - 1)) {
      c = (e.indexOf(n[d]) + (t - n[d]) / (n[d + 1] - n[d])) / (i - 1);
      p = true;
    }
    d++;
  }
  return Math.floor(c * s) / s;
};
exports.PERMUT = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return u.value;
  } else {
    return n.FACT(e) / n.FACT(e - t);
  }
};
exports.PERMUTATIONA = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return u.value;
  } else {
    return Math.pow(e, t);
  }
};
exports.PHI = function (e) {
  e = a.parseNumber(e);
  if (e instanceof Error) {
    return u.value;
  } else {
    return Math.exp(e * -0.5 * e) / c;
  }
};
exports.POISSON = {};
exports.POISSON.DIST = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return u.value;
  } else if (r) {
    return o.poisson.cdf(e, t);
  } else {
    return o.poisson.pdf(e, t);
  }
};
exports.PROB = function (e, t, r, n) {
  if (r === undefined) {
    return 0;
  }
  n = n === undefined ? r : n;
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumberArray(a.flatten(t));
  r = a.parseNumber(r);
  n = a.parseNumber(n);
  if (a.anyIsError(e, t, r, n)) {
    return u.value;
  }
  if (r === n) {
    if (e.indexOf(r) >= 0) {
      return t[e.indexOf(r)];
    } else {
      return 0;
    }
  }
  var i = e.sort(function (e, t) {
    return e - t;
  });
  for (var o = i.length, s = 0, l = 0; l < o; l++) {
    if (i[l] >= r && i[l] <= n) {
      s += t[e.indexOf(i[l])];
    }
  }
  return s;
};
exports.QUARTILE = {};
exports.QUARTILE.EXC = function (e, r) {
  e = a.parseNumberArray(a.flatten(e));
  r = a.parseNumber(r);
  if (a.anyIsError(e, r)) {
    return u.value;
  }
  switch (r) {
    case 1:
      return exports.PERCENTILE.EXC(e, 0.25);
    case 2:
      return exports.PERCENTILE.EXC(e, 0.5);
    case 3:
      return exports.PERCENTILE.EXC(e, 0.75);
    default:
      return u.num;
  }
};
exports.QUARTILE.INC = function (e, r) {
  e = a.parseNumberArray(a.flatten(e));
  r = a.parseNumber(r);
  if (a.anyIsError(e, r)) {
    return u.value;
  }
  switch (r) {
    case 1:
      return exports.PERCENTILE.INC(e, 0.25);
    case 2:
      return exports.PERCENTILE.INC(e, 0.5);
    case 3:
      return exports.PERCENTILE.INC(e, 0.75);
    default:
      return u.num;
  }
};
exports.RANK = {};
exports.RANK.AVG = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumberArray(a.flatten(t));
  if (a.anyIsError(e, t)) {
    return u.value;
  }
  t = a.flatten(t);
  r = r || false;
  var n = r ? function (e, t) {
    return e - t;
  } : function (e, t) {
    return t - e;
  };
  t = t.sort(n);
  for (var i = t.length, o = 0, s = 0; s < i; s++) {
    if (t[s] === e) {
      o++;
    }
  }
  if (o > 1) {
    return (t.indexOf(e) * 2 + o + 1) / 2;
  } else {
    return t.indexOf(e) + 1;
  }
};
exports.RANK.EQ = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumberArray(a.flatten(t));
  if (a.anyIsError(e, t)) {
    return u.value;
  }
  r = r || false;
  var n = r ? function (e, t) {
    return e - t;
  } : function (e, t) {
    return t - e;
  };
  t = t.sort(n);
  return t.indexOf(e) + 1;
};
exports.ROW = function (e, t) {
  if (arguments.length !== 2) {
    return u.na;
  } else if (t < 0) {
    return u.num;
  } else if (e instanceof Array && typeof t === "number") {
    if (e.length !== 0) {
      return o.row(e, t);
    } else {
      return undefined;
    }
  } else {
    return u.value;
  }
};
exports.ROWS = function (e) {
  if (arguments.length !== 1) {
    return u.na;
  } else if (e instanceof Array) {
    if (e.length === 0) {
      return 0;
    } else {
      return o.rows(e);
    }
  } else {
    return u.value;
  }
};
exports.RSQ = function (e, r) {
  e = a.parseNumberArray(a.flatten(e));
  r = a.parseNumberArray(a.flatten(r));
  if (a.anyIsError(e, r)) {
    return u.value;
  } else {
    return Math.pow(exports.PEARSON(e, r), 2);
  }
};
exports.SKEW = function () {
  var e = a.parseNumberArray(a.flatten(arguments));
  if (e instanceof Error) {
    return e;
  }
  var t = o.mean(e);
  for (var r = e.length, n = 0, i = 0; i < r; i++) {
    n += Math.pow(e[i] - t, 3);
  }
  return r * n / ((r - 1) * (r - 2) * Math.pow(o.stdev(e, true), 3));
};
exports.SKEW.P = function () {
  var e = a.parseNumberArray(a.flatten(arguments));
  if (e instanceof Error) {
    return e;
  }
  var t = o.mean(e);
  for (var r = e.length, n = 0, i = 0, s = 0; s < r; s++) {
    i += Math.pow(e[s] - t, 3);
    n += Math.pow(e[s] - t, 2);
  }
  i /= r;
  n /= r;
  return i / Math.pow(n, 1.5);
};
exports.SLOPE = function (e, t) {
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumberArray(a.flatten(t));
  if (a.anyIsError(e, t)) {
    return u.value;
  }
  var r = o.mean(t);
  var n = o.mean(e);
  for (var i = t.length, s = 0, l = 0, c = 0; c < i; c++) {
    s += (t[c] - r) * (e[c] - n);
    l += Math.pow(t[c] - r, 2);
  }
  return s / l;
};
exports.SMALL = function (e, t) {
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return e;
  } else {
    return e.sort(function (e, t) {
      return e - t;
    })[t - 1];
  }
};
exports.STANDARDIZE = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  } else {
    return (e - t) / r;
  }
};
exports.STDEV = {};
exports.STDEV.P = function () {
  var e = exports.VAR.P.apply(this, arguments);
  var r = Math.sqrt(e);
  if (isNaN(r)) {
    r = u.num;
  }
  return r;
};
exports.STDEV.S = function () {
  var e = exports.VAR.S.apply(this, arguments);
  var r = Math.sqrt(e);
  return r;
};
exports.STDEVA = function () {
  var e = exports.VARA.apply(this, arguments);
  var r = Math.sqrt(e);
  return r;
};
exports.STDEVPA = function () {
  var e = exports.VARPA.apply(this, arguments);
  var r = Math.sqrt(e);
  if (isNaN(r)) {
    r = u.num;
  }
  return r;
};
exports.STEYX = function (e, t) {
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumberArray(a.flatten(t));
  if (a.anyIsError(e, t)) {
    return u.value;
  }
  var r = o.mean(t);
  var n = o.mean(e);
  for (var i = t.length, s = 0, l = 0, c = 0, p = 0; p < i; p++) {
    s += Math.pow(e[p] - n, 2);
    l += (t[p] - r) * (e[p] - n);
    c += Math.pow(t[p] - r, 2);
  }
  return Math.sqrt((s - l * l / c) / (i - 2));
};
exports.TRANSPOSE = function (e) {
  if (e) {
    return o.transpose(e);
  } else {
    return u.na;
  }
};
exports.T = i.T;
exports.T.DIST = function (e, r, n) {
  if (n !== 1 && n !== 2) {
    return u.num;
  } else if (n === 1) {
    return exports.T.DIST.RT(e, r);
  } else {
    return exports.T.DIST["2T"](e, r);
  }
};
exports.T.DIST["2T"] = function (e, t) {
  if (arguments.length !== 2) {
    return u.na;
  } else if (e < 0 || t < 1) {
    return u.num;
  } else if (typeof e !== "number" || typeof t !== "number") {
    return u.value;
  } else {
    return (1 - o.studentt.cdf(e, t)) * 2;
  }
};
exports.T.DIST.RT = function (e, t) {
  if (arguments.length !== 2) {
    return u.na;
  } else if (e < 0 || t < 1) {
    return u.num;
  } else if (typeof e !== "number" || typeof t !== "number") {
    return u.value;
  } else {
    return 1 - o.studentt.cdf(e, t);
  }
};
exports.T.INV = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return u.value;
  } else {
    return o.studentt.inv(e, t);
  }
};
exports.T.INV["2T"] = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (e <= 0 || e > 1 || t < 1) {
    return u.num;
  } else if (a.anyIsError(e, t)) {
    return u.value;
  } else {
    return Math.abs(o.studentt.inv(e / 2, t));
  }
};
exports.T.TEST = function (e, r) {
  e = a.parseNumberArray(a.flatten(e));
  r = a.parseNumberArray(a.flatten(r));
  if (a.anyIsError(e, r)) {
    return u.value;
  }
  var n;
  var i = o.mean(e);
  var s = o.mean(r);
  var l = 0;
  var c = 0;
  for (n = 0; n < e.length; n++) {
    l += Math.pow(e[n] - i, 2);
  }
  for (n = 0; n < r.length; n++) {
    c += Math.pow(r[n] - s, 2);
  }
  l /= e.length - 1;
  c /= r.length - 1;
  var p = Math.abs(i - s) / Math.sqrt(l / e.length + c / r.length);
  return exports.T.DIST["2T"](p, e.length + r.length - 2);
};
exports.TREND = function (e, r, n) {
  e = a.parseNumberArray(a.flatten(e));
  r = a.parseNumberArray(a.flatten(r));
  n = a.parseNumberArray(a.flatten(n));
  if (a.anyIsError(e, r, n)) {
    return u.value;
  }
  var i = exports.LINEST(e, r);
  var o = i[0];
  var s = i[1];
  var l = [];
  n.forEach(function (e) {
    l.push(o * e + s);
  });
  return l;
};
exports.TRIMMEAN = function (e, t) {
  e = a.parseNumberArray(a.flatten(e));
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return u.value;
  }
  var r = n.FLOOR(e.length * t, 2) / 2;
  return o.mean(a.initial(a.rest(e.sort(function (e, t) {
    return e - t;
  }), r), r));
};
exports.VAR = {};
exports.VAR.P = function () {
  var e;
  var r = a.numbers(a.flatten(arguments));
  for (var n = r.length, i = 0, o = exports.AVERAGE(r), s = 0; s < n; s++) {
    i += Math.pow(r[s] - o, 2);
  }
  e = i / n;
  if (isNaN(e)) {
    e = u.num;
  }
  return e;
};
exports.VAR.S = function () {
  var e = a.numbers(a.flatten(arguments));
  for (var r = e.length, n = 0, i = exports.AVERAGE(e), o = 0; o < r; o++) {
    n += Math.pow(e[o] - i, 2);
  }
  return n / (r - 1);
};
exports.VARA = function () {
  var e = a.flatten(arguments);
  for (var r = e.length, n = 0, i = 0, o = exports.AVERAGEA(e), s = 0; s < r; s++) {
    var u = e[s];
    n += typeof u === "number" ? Math.pow(u - o, 2) : u === true ? Math.pow(1 - o, 2) : Math.pow(0 - o, 2);
    if (u !== null) {
      i++;
    }
  }
  return n / (i - 1);
};
exports.VARPA = function () {
  var e;
  var r = a.flatten(arguments);
  for (var n = r.length, i = 0, o = 0, s = exports.AVERAGEA(r), l = 0; l < n; l++) {
    var c = r[l];
    i += typeof c === "number" ? Math.pow(c - s, 2) : c === true ? Math.pow(1 - s, 2) : Math.pow(0 - s, 2);
    if (c !== null) {
      o++;
    }
  }
  e = i / o;
  if (isNaN(e)) {
    e = u.num;
  }
  return e;
};
exports.WEIBULL = {};
exports.WEIBULL.DIST = function (e, t, r, n) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  r = a.parseNumber(r);
  if (a.anyIsError(e, t, r)) {
    return u.value;
  } else if (n) {
    return 1 - Math.exp(-Math.pow(e / r, t));
  } else {
    return Math.pow(e, t - 1) * Math.exp(-Math.pow(e / r, t)) * t / Math.pow(r, t);
  }
};
exports.Z = {};
exports.Z.TEST = function (e, r, n) {
  e = a.parseNumberArray(a.flatten(e));
  r = a.parseNumber(r);
  if (a.anyIsError(e, r)) {
    return u.value;
  }
  n = n || exports.STDEV.S(e);
  var i = e.length;
  return 1 - exports.NORM.S.DIST((exports.AVERAGE(e) - r) / (n / Math.sqrt(i)), true);
};
};
