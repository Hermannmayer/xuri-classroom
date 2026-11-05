// webpack module 52733 — body from webcrack
module.exports = function (module, exports, require) {
(function (e, t) {
  t(require("./11333.js"));
})(0, function (e) {
  "use strict";

  var t = e.defineLocale("zh-tw", {
    months: "一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月".split("_"),
    monthsShort: "1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),
    weekdays: "星期日_星期一_星期二_星期三_星期四_星期五_星期六".split("_"),
    weekdaysShort: "週日_週一_週二_週三_週四_週五_週六".split("_"),
    weekdaysMin: "日_一_二_三_四_五_六".split("_"),
    longDateFormat: {
      LT: "HH:mm",
      LTS: "HH:mm:ss",
      L: "YYYY/MM/DD",
      LL: "YYYY年M月D日",
      LLL: "YYYY年M月D日 HH:mm",
      LLLL: "YYYY年M月D日dddd HH:mm",
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
      } else if (t === "中午") {
        if (e >= 11) {
          return e;
        } else {
          return e + 12;
        }
      } else if (t === "下午" || t === "晚上") {
        return e + 12;
      } else {
        return undefined;
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
      sameDay: "[今天] LT",
      nextDay: "[明天] LT",
      nextWeek: "[下]dddd LT",
      lastDay: "[昨天] LT",
      lastWeek: "[上]dddd LT",
      sameElse: "L"
    },
    dayOfMonthOrdinalParse: /\d{1,2}(\u65e5|\u6708|\u9031)/,
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
          return e + "週";
        default:
          return e;
      }
    },
    relativeTime: {
      future: "%s後",
      past: "%s前",
      s: "幾秒",
      ss: "%d 秒",
      m: "1 分鐘",
      mm: "%d 分鐘",
      h: "1 小時",
      hh: "%d 小時",
      d: "1 天",
      dd: "%d 天",
      M: "1 個月",
      MM: "%d 個月",
      y: "1 年",
      yy: "%d 年"
    }
  });
  return t;
});
};
