// webpack module 24449 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js");
exports.Z = undefined;
var i = n(require("./5726.js"));
var o = require("./69721.js");
var a = n(require("./68102.js"));
var s = n(require("./99471.js"));
var u = n(require("./83867.js"));
var l = n(require("./1942.js"));
var c = n(require("./1293.js"));
var p = n(require("./93597.js"));
i.default.extend(p.default);
i.default.extend(c.default);
i.default.extend(a.default);
i.default.extend(s.default);
i.default.extend(u.default);
i.default.extend(l.default);
i.default.extend(function (e, t) {
  var r = t.prototype;
  var n = r.format;
  r.format = function (e) {
    var t = (e || "").replace("Wo", "wo");
    return n.bind(this)(t);
  };
});
var d = {
  bn_BD: "bn-bd",
  by_BY: "be",
  en_GB: "en-gb",
  en_US: "en",
  fr_BE: "fr",
  fr_CA: "fr-ca",
  hy_AM: "hy-am",
  kmr_IQ: "ku",
  nl_BE: "nl-be",
  pt_BR: "pt-br",
  zh_CN: "zh-cn",
  zh_HK: "zh-hk",
  zh_TW: "zh-tw"
};
function f(e) {
  var t = d[e];
  return t || e.split("_")[0];
}
function g() {
  (0, o.noteOnce)(false, "Not match any format. Please help to fire a issue about this.");
}
var m = {
  getNow: function () {
    return (0, i.default)();
  },
  getFixedDate: function (e) {
    return (0, i.default)(e, ["YYYY-M-DD", "YYYY-MM-DD"]);
  },
  getEndDate: function (e) {
    return e.endOf("month");
  },
  getWeekDay: function (e) {
    var t = e.locale("en");
    return t.weekday() + t.localeData().firstDayOfWeek();
  },
  getYear: function (e) {
    return e.year();
  },
  getMonth: function (e) {
    return e.month();
  },
  getDate: function (e) {
    return e.date();
  },
  getHour: function (e) {
    return e.hour();
  },
  getMinute: function (e) {
    return e.minute();
  },
  getSecond: function (e) {
    return e.second();
  },
  addYear: function (e, t) {
    return e.add(t, "year");
  },
  addMonth: function (e, t) {
    return e.add(t, "month");
  },
  addDate: function (e, t) {
    return e.add(t, "day");
  },
  setYear: function (e, t) {
    return e.year(t);
  },
  setMonth: function (e, t) {
    return e.month(t);
  },
  setDate: function (e, t) {
    return e.date(t);
  },
  setHour: function (e, t) {
    return e.hour(t);
  },
  setMinute: function (e, t) {
    return e.minute(t);
  },
  setSecond: function (e, t) {
    return e.second(t);
  },
  isAfter: function (e, t) {
    return e.isAfter(t);
  },
  isValidate: function (e) {
    return e.isValid();
  },
  locale: {
    getWeekFirstDay: function (e) {
      return (0, i.default)().locale(f(e)).localeData().firstDayOfWeek();
    },
    getWeekFirstDate: function (e, t) {
      return t.locale(f(e)).weekday(0);
    },
    getWeek: function (e, t) {
      return t.locale(f(e)).week();
    },
    getShortWeekDays: function (e) {
      return (0, i.default)().locale(f(e)).localeData().weekdaysMin();
    },
    getShortMonths: function (e) {
      return (0, i.default)().locale(f(e)).localeData().monthsShort();
    },
    format: function (e, t, r) {
      return t.locale(f(e)).format(r);
    },
    parse: function (e, t, r) {
      var n = f(e);
      for (var o = 0; o < r.length; o += 1) {
        var a = r[o];
        var s = t;
        if (a.includes("wo") || a.includes("Wo")) {
          var u = s.split("-")[0];
          var l = s.split("-")[1];
          var c = (0, i.default)(u, "YYYY").startOf("year").locale(n);
          for (var p = 0; p <= 52; p += 1) {
            var d = c.add(p, "week");
            if (d.format("Wo") === l) {
              return d;
            }
          }
          g();
          return null;
        }
        var m = (0, i.default)(s, a).locale(n);
        if (m.isValid()) {
          return m;
        }
      }
      if (t) {
        g();
      }
      return null;
    }
  }
};
var v = m;
exports.Z = v;
};
