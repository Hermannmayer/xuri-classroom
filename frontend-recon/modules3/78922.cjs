// webpack module 78922 — body from webcrack
module.exports = function (module, exports, require) {
(function (e, t) {
  t(require("./11333.js"));
})(0, function (e) {
  "use strict";

  var t = e.defineLocale("ja", {
    eras: [{
      since: "2019-05-01",
      offset: 1,
      name: "令和",
      narrow: "㋿",
      abbr: "R"
    }, {
      since: "1989-01-08",
      until: "2019-04-30",
      offset: 1,
      name: "平成",
      narrow: "㍻",
      abbr: "H"
    }, {
      since: "1926-12-25",
      until: "1989-01-07",
      offset: 1,
      name: "昭和",
      narrow: "㍼",
      abbr: "S"
    }, {
      since: "1912-07-30",
      until: "1926-12-24",
      offset: 1,
      name: "大正",
      narrow: "㍽",
      abbr: "T"
    }, {
      since: "1873-01-01",
      until: "1912-07-29",
      offset: 6,
      name: "明治",
      narrow: "㍾",
      abbr: "M"
    }, {
      since: "0001-01-01",
      until: "1873-12-31",
      offset: 1,
      name: "西暦",
      narrow: "AD",
      abbr: "AD"
    }, {
      since: "0000-12-31",
      until: -Infinity,
      offset: 1,
      name: "紀元前",
      narrow: "BC",
      abbr: "BC"
    }],
    eraYearOrdinalRegex: /(\u5143|\d+)\u5e74/,
    eraYearOrdinalParse: function (e, t) {
      if (t[1] === "元") {
        return 1;
      } else {
        return parseInt(t[1] || e, 10);
      }
    },
    months: "1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),
    monthsShort: "1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),
    weekdays: "日曜日_月曜日_火曜日_水曜日_木曜日_金曜日_土曜日".split("_"),
    weekdaysShort: "日_月_火_水_木_金_土".split("_"),
    weekdaysMin: "日_月_火_水_木_金_土".split("_"),
    longDateFormat: {
      LT: "HH:mm",
      LTS: "HH:mm:ss",
      L: "YYYY/MM/DD",
      LL: "YYYY年M月D日",
      LLL: "YYYY年M月D日 HH:mm",
      LLLL: "YYYY年M月D日 dddd HH:mm",
      l: "YYYY/MM/DD",
      ll: "YYYY年M月D日",
      lll: "YYYY年M月D日 HH:mm",
      llll: "YYYY年M月D日(ddd) HH:mm"
    },
    meridiemParse: /\u5348\u524d|\u5348\u5f8c/i,
    isPM: function (e) {
      return e === "午後";
    },
    meridiem: function (e, t, r) {
      if (e < 12) {
        return "午前";
      } else {
        return "午後";
      }
    },
    calendar: {
      sameDay: "[今日] LT",
      nextDay: "[明日] LT",
      nextWeek: function (e) {
        if (e.week() !== this.week()) {
          return "[来週]dddd LT";
        } else {
          return "dddd LT";
        }
      },
      lastDay: "[昨日] LT",
      lastWeek: function (e) {
        if (this.week() !== e.week()) {
          return "[先週]dddd LT";
        } else {
          return "dddd LT";
        }
      },
      sameElse: "L"
    },
    dayOfMonthOrdinalParse: /\d{1,2}\u65e5/,
    ordinal: function (e, t) {
      switch (t) {
        case "y":
          if (e === 1) {
            return "元年";
          } else {
            return e + "年";
          }
        case "d":
        case "D":
        case "DDD":
          return e + "日";
        default:
          return e;
      }
    },
    relativeTime: {
      future: "%s後",
      past: "%s前",
      s: "数秒",
      ss: "%d秒",
      m: "1分",
      mm: "%d分",
      h: "1時間",
      hh: "%d時間",
      d: "1日",
      dd: "%d日",
      M: "1ヶ月",
      MM: "%dヶ月",
      y: "1年",
      yy: "%d年"
    }
  });
  return t;
});
};
