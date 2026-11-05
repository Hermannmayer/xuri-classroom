// webpack module 68569 — body from webcrack
module.exports = function (module, exports, require) {
(function (e, t) {
  t(require("./11333.js"));
})(0, function (e) {
  "use strict";

  var t = e.defineLocale("zh-cn", {
    months: "一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月".split("_"),
    monthsShort: "1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),
    weekdays: "星期日_星期一_星期二_星期三_星期四_星期五_星期六".split("_"),
    weekdaysShort: "周日_周一_周二_周三_周四_周五_周六".split("_"),
    weekdaysMin: "日_一_二_三_四_五_六".split("_"),
    longDateFormat: {
      LT: "HH:mm",
      LTS: "HH:mm:ss",
      L: "YYYY/MM/DD",
      LL: "YYYY年M月D日",
      LLL: "YYYY年M月D日Ah点mm分",
      LLLL: "YYYY年M月D日ddddAh点mm分",
      l: "YYYY/M/D",
      ll: "YYYY年M月D日",
      lll: "YYYY年M月D日 HH:mm",
      llll: "YYYY年M月D日dddd HH:mm"
    },
    meridiemParse: /\u51cc\u6668|\u65e9\u4e0a|\u4e0a\u5348|\u4e2d\u5348|\u4e0b\u5348|\u665a\u4e0a/,
    meridiemHour: function (e, t) {
      if (e === 12) {
        e = 0;
      }
      if (t === "凌晨" || t === "早上" || t === "上午") {
        return e;
      } else if (t === "下午" || t === "晚上") {
        return e + 12;
      } else if (e >= 11) {
        return e;
      } else {
        return e + 12;
      }
    },
    meridiem: function (e, t, r) {
      var n = e * 100 + t;
      if (n < 600) {
        return "凌晨";
      } else if (n < 900) {
        return "早上";
      } else if (n < 1130) {
        return "上午";
      } else if (n < 1230) {
        return "中午";
      } else if (n < 1800) {
        return "下午";
      } else {
        return "晚上";
      }
    },
    calendar: {
      sameDay: "[今天]LT",
      nextDay: "[明天]LT",
      nextWeek: function (e) {
        if (e.week() !== this.week()) {
          return "[下]dddLT";
        } else {
          return "[本]dddLT";
        }
      },
      lastDay: "[昨天]LT",
      lastWeek: function (e) {
        if (this.week() !== e.week()) {
          return "[上]dddLT";
        } else {
          return "[本]dddLT";
        }
      },
      sameElse: "L"
    },
    dayOfMonthOrdinalParse: /\d{1,2}(\u65e5|\u6708|\u5468)/,
    ordinal: function (e, t) {
      switch (t) {
        case "d":
        case "D":
        case "DDD":
          return e + "日";
        case "M":
          return e + "月";
        case "w":
        case "W":
          return e + "周";
        default:
          return e;
      }
    },
    relativeTime: {
      future: "%s后",
      past: "%s前",
      s: "几秒",
      ss: "%d 秒",
      m: "1 分钟",
      mm: "%d 分钟",
      h: "1 小时",
      hh: "%d 小时",
      d: "1 天",
      dd: "%d 天",
      w: "1 周",
      ww: "%d 周",
      M: "1 个月",
      MM: "%d 个月",
      y: "1 年",
      yy: "%d 年"
    },
    week: {
      dow: 1,
      doy: 4
    }
  });
  return t;
});
};
