// webpack module 99471 — body from webcrack
module.exports = function (module, exports, require) {
(function (t, r) {
  module.exports = r();
})(0, function () {
  "use strict";

  return function (e, t, r) {
    var n = t.prototype;
    function i(e) {
      return e && (e.indexOf ? e : e.s);
    }
    function o(e, t, r, n, o) {
      var a = e.name ? e : e.$locale();
      var s = i(a[t]);
      var u = i(a[r]);
      var l = s || u.map(function (e) {
        return e.slice(0, n);
      });
      if (!o) {
        return l;
      }
      var c = a.weekStart;
      return l.map(function (e, t) {
        return l[(t + (c || 0)) % 7];
      });
    }
    function a() {
      return r.Ls[r.locale()];
    }
    function s(e, t) {
      return e.formats[t] || function (e) {
        return e.replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g, function (e, t, r) {
          return t || r.slice(1);
        });
      }(e.formats[t.toUpperCase()]);
    }
    function u() {
      var e = this;
      return {
        months: function (t) {
          if (t) {
            return t.format("MMMM");
          } else {
            return o(e, "months");
          }
        },
        monthsShort: function (t) {
          if (t) {
            return t.format("MMM");
          } else {
            return o(e, "monthsShort", "months", 3);
          }
        },
        firstDayOfWeek: function () {
          return e.$locale().weekStart || 0;
        },
        weekdays: function (t) {
          if (t) {
            return t.format("dddd");
          } else {
            return o(e, "weekdays");
          }
        },
        weekdaysMin: function (t) {
          if (t) {
            return t.format("dd");
          } else {
            return o(e, "weekdaysMin", "weekdays", 2);
          }
        },
        weekdaysShort: function (t) {
          if (t) {
            return t.format("ddd");
          } else {
            return o(e, "weekdaysShort", "weekdays", 3);
          }
        },
        longDateFormat: function (t) {
          return s(e.$locale(), t);
        },
        meridiem: this.$locale().meridiem,
        ordinal: this.$locale().ordinal
      };
    }
    n.localeData = function () {
      return u.bind(this)();
    };
    r.localeData = function () {
      var e = a();
      return {
        firstDayOfWeek: function () {
          return e.weekStart || 0;
        },
        weekdays: function () {
          return r.weekdays();
        },
        weekdaysShort: function () {
          return r.weekdaysShort();
        },
        weekdaysMin: function () {
          return r.weekdaysMin();
        },
        months: function () {
          return r.months();
        },
        monthsShort: function () {
          return r.monthsShort();
        },
        longDateFormat: function (t) {
          return s(e, t);
        },
        meridiem: e.meridiem,
        ordinal: e.ordinal
      };
    };
    r.months = function () {
      return o(a(), "months");
    };
    r.monthsShort = function () {
      return o(a(), "monthsShort", "months", 3);
    };
    r.weekdays = function (e) {
      return o(a(), "weekdays", null, null, e);
    };
    r.weekdaysShort = function (e) {
      return o(a(), "weekdaysShort", "weekdays", 3, e);
    };
    r.weekdaysMin = function (e) {
      return o(a(), "weekdaysMin", "weekdays", 2, e);
    };
  };
});
};
