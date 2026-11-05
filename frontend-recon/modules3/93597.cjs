// webpack module 93597 — body from webcrack
module.exports = function (module, exports, require) {
(function (t, r) {
  module.exports = r();
})(0, function () {
  "use strict";

  var e = {
    LTS: "h:mm:ss A",
    LT: "h:mm A",
    L: "MM/DD/YYYY",
    LL: "MMMM D, YYYY",
    LLL: "MMMM D, YYYY h:mm A",
    LLLL: "dddd, MMMM D, YYYY h:mm A"
  };
  var t = /(\[[^[]*\])|([-_:/.,()\s]+)|(A|a|YYYY|YY?|MM?M?M?|Do|DD?|hh?|HH?|mm?|ss?|S{1,3}|z|ZZ?)/g;
  var r = /\d\d/;
  var n = /\d\d?/;
  var i = /\d*[^-_:/,()\s\d]+/;
  var o = {};
  function a(e) {
    return (e = +e) + (e > 68 ? 1900 : 2000);
  }
  function s(e) {
    return function (t) {
      this[e] = +t;
    };
  }
  var u = [/[+-]\d\d:?(\d\d)?|Z/, function (e) {
    (this.zone ||= {}).offset = function (e) {
      if (!e) {
        return 0;
      }
      if (e === "Z") {
        return 0;
      }
      var t = e.match(/([+-]|\d\d)/g);
      var r = t[1] * 60 + (+t[2] || 0);
      if (r === 0) {
        return 0;
      } else if (t[0] === "+") {
        return -r;
      } else {
        return r;
      }
    }(e);
  }];
  function l(e) {
    var t = o[e];
    return t && (t.indexOf ? t : t.s.concat(t.f));
  }
  function c(e, t) {
    var r;
    var n = o.meridiem;
    if (n) {
      for (var i = 1; i <= 24; i += 1) {
        if (e.indexOf(n(i, 0, t)) > -1) {
          r = i > 12;
          break;
        }
      }
    } else {
      r = e === (t ? "pm" : "PM");
    }
    return r;
  }
  var p = {
    A: [i, function (e) {
      this.afternoon = c(e, false);
    }],
    a: [i, function (e) {
      this.afternoon = c(e, true);
    }],
    S: [/\d/, function (e) {
      this.milliseconds = +e * 100;
    }],
    SS: [r, function (e) {
      this.milliseconds = +e * 10;
    }],
    SSS: [/\d{3}/, function (e) {
      this.milliseconds = +e;
    }],
    s: [n, s("seconds")],
    ss: [n, s("seconds")],
    m: [n, s("minutes")],
    mm: [n, s("minutes")],
    H: [n, s("hours")],
    h: [n, s("hours")],
    HH: [n, s("hours")],
    hh: [n, s("hours")],
    D: [n, s("day")],
    DD: [r, s("day")],
    Do: [i, function (e) {
      var t = o.ordinal;
      var r = e.match(/\d+/);
      this.day = r[0];
      if (t) {
        for (var n = 1; n <= 31; n += 1) {
          if (t(n).replace(/\[|\]/g, "") === e) {
            this.day = n;
          }
        }
      }
    }],
    M: [n, s("month")],
    MM: [r, s("month")],
    MMM: [i, function (e) {
      var t = l("months");
      var r = (l("monthsShort") || t.map(function (e) {
        return e.slice(0, 3);
      })).indexOf(e) + 1;
      if (r < 1) {
        throw new Error();
      }
      this.month = r % 12 || r;
    }],
    MMMM: [i, function (e) {
      var t = l("months").indexOf(e) + 1;
      if (t < 1) {
        throw new Error();
      }
      this.month = t % 12 || t;
    }],
    Y: [/[+-]?\d+/, s("year")],
    YY: [r, function (e) {
      this.year = a(e);
    }],
    YYYY: [/\d{4}/, s("year")],
    Z: u,
    ZZ: u
  };
  function d(r) {
    var n;
    var i;
    n = r;
    i = o && o.formats;
    var a = (r = n.replace(/(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g, function (t, r, n) {
      var o = n && n.toUpperCase();
      return r || i[n] || e[n] || i[o].replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g, function (e, t, r) {
        return t || r.slice(1);
      });
    })).match(t);
    for (var s = a.length, u = 0; u < s; u += 1) {
      var l = a[u];
      var c = p[l];
      var d = c && c[0];
      var f = c && c[1];
      a[u] = f ? {
        regex: d,
        parser: f
      } : l.replace(/^\[|\]$/g, "");
    }
    return function (e) {
      var t = {};
      for (var r = 0, n = 0; r < s; r += 1) {
        var i = a[r];
        if (typeof i == "string") {
          n += i.length;
        } else {
          var o = i.regex;
          var u = i.parser;
          var l = e.slice(n);
          var c = o.exec(l)[0];
          u.call(t, c);
          e = e.replace(c, "");
        }
      }
      (function (e) {
        var t = e.afternoon;
        if (t !== undefined) {
          var r = e.hours;
          if (t) {
            if (r < 12) {
              e.hours += 12;
            }
          } else if (r === 12) {
            e.hours = 0;
          }
          delete e.afternoon;
        }
      })(t);
      return t;
    };
  }
  return function (e, t, r) {
    r.p.customParseFormat = true;
    if (e && e.parseTwoDigitYear) {
      a = e.parseTwoDigitYear;
    }
    var n = t.prototype;
    var i = n.parse;
    n.parse = function (e) {
      var t = e.date;
      var n = e.utc;
      var a = e.args;
      this.$u = n;
      var s = a[1];
      if (typeof s == "string") {
        var u = a[2] === true;
        var l = a[3] === true;
        var c = u || l;
        var p = a[2];
        if (l) {
          p = a[2];
        }
        o = this.$locale();
        if (!u && p) {
          o = r.Ls[p];
        }
        this.$d = function (e, t, r) {
          try {
            if (["x", "X"].indexOf(t) > -1) {
              return new Date((t === "X" ? 1000 : 1) * e);
            }
            var n = d(t)(e);
            var i = n.year;
            var o = n.month;
            var a = n.day;
            var s = n.hours;
            var u = n.minutes;
            var l = n.seconds;
            var c = n.milliseconds;
            var p = n.zone;
            var f = new Date();
            var g = a || (i || o ? 1 : f.getDate());
            var m = i || f.getFullYear();
            var v = 0;
            if (!i || !!o) {
              v = o > 0 ? o - 1 : f.getMonth();
            }
            var y = s || 0;
            var h = u || 0;
            var b = l || 0;
            var w = c || 0;
            if (p) {
              return new Date(Date.UTC(m, v, g, y, h, b, w + p.offset * 60 * 1000));
            } else if (r) {
              return new Date(Date.UTC(m, v, g, y, h, b, w));
            } else {
              return new Date(m, v, g, y, h, b, w);
            }
          } catch (e) {
            return new Date("");
          }
        }(t, s, n);
        this.init();
        if (p && p !== true) {
          this.$L = this.locale(p).$L;
        }
        if (c && t != this.format(s)) {
          this.$d = new Date("");
        }
        o = {};
      } else if (s instanceof Array) {
        for (var f = s.length, g = 1; g <= f; g += 1) {
          a[1] = s[g - 1];
          var m = r.apply(this, a);
          if (m.isValid()) {
            this.$d = m.$d;
            this.$L = m.$L;
            this.init();
            break;
          }
          if (g === f) {
            this.$d = new Date("");
          }
        }
      } else {
        i.call(this, e);
      }
    };
  };
});
};
