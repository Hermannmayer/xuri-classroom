// webpack module 38666 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60511.js");
var i = require("./83721.js");
var o = new Date(Date.UTC(1900, 0, 1));
var a = [undefined, 0, 1, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 1, 2, 3, 4, 5, 6, 0];
var s = [[], [1, 2, 3, 4, 5, 6, 7], [7, 1, 2, 3, 4, 5, 6], [6, 0, 1, 2, 3, 4, 5], [], [], [], [], [], [], [], [7, 1, 2, 3, 4, 5, 6], [6, 7, 1, 2, 3, 4, 5], [5, 6, 7, 1, 2, 3, 4], [4, 5, 6, 7, 1, 2, 3], [3, 4, 5, 6, 7, 1, 2], [2, 3, 4, 5, 6, 7, 1], [1, 2, 3, 4, 5, 6, 7]];
var u = [[], [6, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], undefined, undefined, undefined, [0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6]];
function l(e) {
  var t = new Date(e);
  t.setHours(0, 0, 0, 0);
  return t;
}
function c(e) {
  return new Date(e, 1, 29).getMonth() === 1;
}
function p(e, t) {
  return Math.ceil((t - e) / 1000 / 60 / 60 / 24);
}
function d(e) {
  var t = e > -2203891200000 ? 2 : 1;
  return Math.ceil((e - o) / 86400000) + t;
}
exports.DATE = function (e, t, r) {
  var o;
  e = i.parseNumber(e);
  t = i.parseNumber(t);
  r = i.parseNumber(r);
  if (i.anyIsError(e, t, r)) {
    o = n.value;
  } else {
    o = new Date(e, t - 1, r);
    if (o.getFullYear() < 0) {
      o = n.num;
    }
  }
  return o;
};
exports.DATEDIF = function (e, r, n) {
  n = n.toUpperCase();
  e = i.parseDate(e);
  r = i.parseDate(r);
  var o;
  var a = e.getFullYear();
  var s = e.getMonth();
  var u = e.getDate();
  var l = r.getFullYear();
  var c = r.getMonth();
  var p = r.getDate();
  switch (n) {
    case "Y":
      o = Math.floor(exports.YEARFRAC(e, r));
      break;
    case "D":
      o = exports.DAYS(r, e);
      break;
    case "M":
      o = c - s + (l - a) * 12;
      if (p < u) {
        o--;
      }
      break;
    case "MD":
      if (u <= p) {
        o = p - u;
      } else {
        if (c === 0) {
          e.setFullYear(l - 1);
          e.setMonth(12);
        } else {
          e.setFullYear(l);
          e.setMonth(c - 1);
        }
        o = exports.DAYS(r, e);
      }
      break;
    case "YM":
      o = c - s + (l - a) * 12;
      if (p < u) {
        o--;
      }
      o %= 12;
      break;
    case "YD":
      if (c > s || c === s && p < u) {
        e.setFullYear(l);
      } else {
        e.setFullYear(l - 1);
      }
      o = exports.DAYS(r, e);
      break;
  }
  return o;
};
exports.DATEVALUE = function (e) {
  if (typeof e !== "string") {
    return n.value;
  }
  var t = Date.parse(e);
  if (isNaN(t)) {
    return n.value;
  } else {
    return new Date(e);
  }
};
exports.DAY = function (e) {
  var t = i.parseDate(e);
  if (t instanceof Error) {
    return t;
  } else {
    return t.getDate();
  }
};
exports.DAYS = function (e, t) {
  e = i.parseDate(e);
  t = i.parseDate(t);
  if (e instanceof Error) {
    return e;
  } else if (t instanceof Error) {
    return t;
  } else {
    return d(l(e)) - d(l(t));
  }
};
exports.DAYS360 = function (e, t, r) {
  r = i.parseBool(r || "false");
  e = i.parseDate(e);
  t = i.parseDate(t);
  if (e instanceof Error) {
    return e;
  }
  if (t instanceof Error) {
    return t;
  }
  if (r instanceof Error) {
    return r;
  }
  var n;
  var o;
  var a = e.getMonth();
  var s = t.getMonth();
  if (r) {
    n = e.getDate() === 31 ? 30 : e.getDate();
    o = t.getDate() === 31 ? 30 : t.getDate();
  } else {
    var u = new Date(e.getFullYear(), a + 1, 0).getDate();
    var l = new Date(t.getFullYear(), s + 1, 0).getDate();
    n = e.getDate() === u ? 30 : e.getDate();
    if (t.getDate() === l) {
      if (n < 30) {
        s++;
        o = 1;
      } else {
        o = 30;
      }
    } else {
      o = t.getDate();
    }
  }
  return (t.getFullYear() - e.getFullYear()) * 360 + (s - a) * 30 + (o - n);
};
exports.EDATE = function (e, t) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  } else if (isNaN(t)) {
    return n.value;
  } else {
    t = parseInt(t, 10);
    e.setMonth(e.getMonth() + t);
    return e;
  }
};
exports.EOMONTH = function (e, t) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  } else if (isNaN(t)) {
    return n.value;
  } else {
    t = parseInt(t, 10);
    return new Date(e.getFullYear(), e.getMonth() + t + 1, 0);
  }
};
exports.HOUR = function (e) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  } else {
    return e.getHours();
  }
};
exports.INTERVAL = function (e) {
  if (typeof e !== "number" && typeof e !== "string") {
    return n.value;
  }
  e = parseInt(e, 10);
  var t = Math.floor(e / 946080000);
  e %= 946080000;
  var r = Math.floor(e / 2592000);
  e %= 2592000;
  var i = Math.floor(e / 86400);
  e %= 86400;
  var o = Math.floor(e / 3600);
  e %= 3600;
  var a = Math.floor(e / 60);
  e %= 60;
  var s = e;
  t = t > 0 ? t + "Y" : "";
  r = r > 0 ? r + "M" : "";
  i = i > 0 ? i + "D" : "";
  o = o > 0 ? o + "H" : "";
  a = a > 0 ? a + "M" : "";
  s = s > 0 ? s + "S" : "";
  return "P" + t + r + i + "T" + o + a + s;
};
exports.ISOWEEKNUM = function (e) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  }
  e = l(e);
  e.setDate(e.getDate() + 4 - (e.getDay() || 7));
  var t = new Date(e.getFullYear(), 0, 1);
  return Math.ceil(((e - t) / 86400000 + 1) / 7);
};
exports.MINUTE = function (e) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  } else {
    return e.getMinutes();
  }
};
exports.MONTH = function (e) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  } else {
    return e.getMonth() + 1;
  }
};
exports.NETWORKDAYS = function (e, t, r) {
  return this.NETWORKDAYS.INTL(e, t, 1, r);
};
exports.NETWORKDAYS.INTL = function (e, t, r, o) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  }
  t = i.parseDate(t);
  if (t instanceof Error) {
    return t;
  }
  var a = false;
  var s = [];
  var l = [1, 2, 3, 4, 5, 6, 0];
  var c = new RegExp("^[0|1]{7}$");
  if (r === undefined) {
    r = u[1];
  } else if (typeof r === "string" && c.test(r)) {
    a = true;
    r = r.split("");
    p = 0;
    for (; p < r.length; p++) {
      if (r[p] === "1") {
        s.push(l[p]);
      }
    }
  } else {
    r = u[r];
  }
  if (!(r instanceof Array)) {
    return n.value;
  }
  if (o === undefined) {
    o = [];
  } else if (!(o instanceof Array)) {
    o = [o];
  }
  for (var p = 0; p < o.length; p++) {
    var d = i.parseDate(o[p]);
    if (d instanceof Error) {
      return d;
    }
    o[p] = d;
  }
  var f = Math.round((t - e) / 86400000) + 1;
  var g = f;
  var m = e;
  for (p = 0; p < f; p++) {
    var v = new Date().getTimezoneOffset() > 0 ? m.getUTCDay() : m.getDay();
    var y = a ? s.includes(v) : v === r[0] || v === r[1];
    for (var h = 0; h < o.length; h++) {
      var b = o[h];
      if (b.getDate() === m.getDate() && b.getMonth() === m.getMonth() && b.getFullYear() === m.getFullYear()) {
        y = true;
        break;
      }
    }
    if (y) {
      g--;
    }
    m.setDate(m.getDate() + 1);
  }
  return g;
};
exports.NOW = function () {
  return new Date();
};
exports.SECOND = function (e) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  } else {
    return e.getSeconds();
  }
};
exports.TIME = function (e, t, r) {
  e = i.parseNumber(e);
  t = i.parseNumber(t);
  r = i.parseNumber(r);
  if (i.anyIsError(e, t, r)) {
    return n.value;
  } else if (e < 0 || t < 0 || r < 0) {
    return n.num;
  } else {
    return (e * 3600 + t * 60 + r) / 86400;
  }
};
exports.TIMEVALUE = function (e) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  } else {
    return (e.getHours() * 3600 + e.getMinutes() * 60 + e.getSeconds()) / 86400;
  }
};
exports.TODAY = function () {
  return l(new Date());
};
exports.WEEKDAY = function (e, t) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  }
  if (t === undefined) {
    t = 1;
  }
  var r = e.getDay();
  return s[t][r];
};
exports.WEEKNUM = function (e, t) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  }
  if (t === undefined) {
    t = 1;
  }
  if (t === 21) {
    return this.ISOWEEKNUM(e);
  }
  var r = a[t];
  var n = new Date(e.getFullYear(), 0, 1);
  var o = n.getDay() < r ? 1 : 0;
  n -= Math.abs(n.getDay() - r) * 24 * 60 * 60 * 1000;
  return Math.floor((e - n) / 86400000 / 7 + 1) + o;
};
exports.WORKDAY = function (e, t, r) {
  return this.WORKDAY.INTL(e, t, 1, r);
};
exports.WORKDAY.INTL = function (e, t, r, o) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  }
  t = i.parseNumber(t);
  if (t instanceof Error) {
    return t;
  }
  if (t < 0) {
    return n.num;
  }
  r = r === undefined ? u[1] : u[r];
  if (!(r instanceof Array)) {
    return n.value;
  }
  if (o === undefined) {
    o = [];
  } else if (!(o instanceof Array)) {
    o = [o];
  }
  for (var a = 0; a < o.length; a++) {
    var s = i.parseDate(o[a]);
    if (s instanceof Error) {
      return s;
    }
    o[a] = s;
  }
  var l = 0;
  while (l < t) {
    e.setDate(e.getDate() + 1);
    var c = e.getDay();
    if (c !== r[0] && c !== r[1]) {
      for (var p = 0; p < o.length; p++) {
        var d = o[p];
        if (d.getDate() === e.getDate() && d.getMonth() === e.getMonth() && d.getFullYear() === e.getFullYear()) {
          l--;
          break;
        }
      }
      l++;
    }
  }
  return e;
};
exports.YEAR = function (e) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  } else {
    return e.getFullYear();
  }
};
exports.YEARFRAC = function (e, t, r) {
  e = i.parseDate(e);
  if (e instanceof Error) {
    return e;
  }
  t = i.parseDate(t);
  if (t instanceof Error) {
    return t;
  }
  r = r || 0;
  var n = e.getDate();
  var o = e.getMonth() + 1;
  var a = e.getFullYear();
  var s = t.getDate();
  var u = t.getMonth() + 1;
  var l = t.getFullYear();
  switch (r) {
    case 0:
      if (n === 31 && s === 31) {
        n = 30;
        s = 30;
      } else if (n === 31) {
        n = 30;
      } else if (n === 30 && s === 31) {
        s = 30;
      }
      return (s + u * 30 + l * 360 - (n + o * 30 + a * 360)) / 360;
    case 1:
      function d(e, t) {
        var r = e.getFullYear();
        var n = new Date(r, 2, 1);
        if (c(r) && e < n && t >= n) {
          return true;
        }
        var i = t.getFullYear();
        var o = new Date(i, 2, 1);
        return c(i) && t >= o && e < o;
      }
      var f = 365;
      if (a === l || a + 1 === l && (o > u || o === u && n >= s)) {
        if (a === l && c(a) || d(e, t) || u === 1 && s === 29) {
          f = 366;
        }
        return p(e, t) / f;
      }
      var g = l - a + 1;
      var m = (new Date(l + 1, 0, 1) - new Date(a, 0, 1)) / 1000 / 60 / 60 / 24;
      var v = m / g;
      return p(e, t) / v;
    case 2:
      return p(e, t) / 360;
    case 3:
      return p(e, t) / 365;
    case 4:
      return (s + u * 30 + l * 360 - (n + o * 30 + a * 360)) / 360;
  }
};
};
