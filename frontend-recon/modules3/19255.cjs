// webpack module 19255 — body from webcrack
module.exports = function (module, exports, require) {
(function (e, t) {
  t(require("./11333.js"));
})(0, function (e) {
  "use strict";

  var t = e.defineLocale("th", {
    months: "มกราคม_กุมภาพันธ์_มีนาคม_เมษายน_พฤษภาคม_มิถุนายน_กรกฎาคม_สิงหาคม_กันยายน_ตุลาคม_พฤศจิกายน_ธันวาคม".split("_"),
    monthsShort: "ม.ค._ก.พ._มี.ค._เม.ย._พ.ค._มิ.ย._ก.ค._ส.ค._ก.ย._ต.ค._พ.ย._ธ.ค.".split("_"),
    monthsParseExact: true,
    weekdays: "อาทิตย์_จันทร์_อังคาร_พุธ_พฤหัสบดี_ศุกร์_เสาร์".split("_"),
    weekdaysShort: "อาทิตย์_จันทร์_อังคาร_พุธ_พฤหัส_ศุกร์_เสาร์".split("_"),
    weekdaysMin: "อา._จ._อ._พ._พฤ._ศ._ส.".split("_"),
    weekdaysParseExact: true,
    longDateFormat: {
      LT: "H:mm",
      LTS: "H:mm:ss",
      L: "DD/MM/YYYY",
      LL: "D MMMM YYYY",
      LLL: "D MMMM YYYY เวลา H:mm",
      LLLL: "วันddddที่ D MMMM YYYY เวลา H:mm"
    },
    meridiemParse: /\u0e01\u0e48\u0e2d\u0e19\u0e40\u0e17\u0e35\u0e48\u0e22\u0e07|\u0e2b\u0e25\u0e31\u0e07\u0e40\u0e17\u0e35\u0e48\u0e22\u0e07/,
    isPM: function (e) {
      return e === "หลังเที่ยง";
    },
    meridiem: function (e, t, r) {
      if (e < 12) {
        return "ก่อนเที่ยง";
      } else {
        return "หลังเที่ยง";
      }
    },
    calendar: {
      sameDay: "[วันนี้ เวลา] LT",
      nextDay: "[พรุ่งนี้ เวลา] LT",
      nextWeek: "dddd[หน้า เวลา] LT",
      lastDay: "[เมื่อวานนี้ เวลา] LT",
      lastWeek: "[วัน]dddd[ที่แล้ว เวลา] LT",
      sameElse: "L"
    },
    relativeTime: {
      future: "อีก %s",
      past: "%sที่แล้ว",
      s: "ไม่กี่วินาที",
      ss: "%d วินาที",
      m: "1 นาที",
      mm: "%d นาที",
      h: "1 ชั่วโมง",
      hh: "%d ชั่วโมง",
      d: "1 วัน",
      dd: "%d วัน",
      w: "1 สัปดาห์",
      ww: "%d สัปดาห์",
      M: "1 เดือน",
      MM: "%d เดือน",
      y: "1 ปี",
      yy: "%d ปี"
    }
  });
  return t;
});
};
