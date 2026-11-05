// webpack module 38301 — body from webcrack
module.exports = function (module, exports, require) {
(function (e, t) {
  t(require("./11333.js"));
})(0, function (e) {
  "use strict";

  var t = /^(janvier|f\xe9vrier|mars|avril|mai|juin|juillet|ao\xfbt|septembre|octobre|novembre|d\xe9cembre)/i;
  var r = /(janv\.?|f\xe9vr\.?|mars|avr\.?|mai|juin|juil\.?|ao\xfbt|sept\.?|oct\.?|nov\.?|d\xe9c\.?)/i;
  var n = /(janv\.?|f\xe9vr\.?|mars|avr\.?|mai|juin|juil\.?|ao\xfbt|sept\.?|oct\.?|nov\.?|d\xe9c\.?|janvier|f\xe9vrier|mars|avril|mai|juin|juillet|ao\xfbt|septembre|octobre|novembre|d\xe9cembre)/i;
  var i = [/^janv/i, /^f\xe9vr/i, /^mars/i, /^avr/i, /^mai/i, /^juin/i, /^juil/i, /^ao\xfbt/i, /^sept/i, /^oct/i, /^nov/i, /^d\xe9c/i];
  var o = e.defineLocale("fr", {
    months: "janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre".split("_"),
    monthsShort: "janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.".split("_"),
    monthsRegex: n,
    monthsShortRegex: n,
    monthsStrictRegex: t,
    monthsShortStrictRegex: r,
    monthsParse: i,
    longMonthsParse: i,
    shortMonthsParse: i,
    weekdays: "dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi".split("_"),
    weekdaysShort: "dim._lun._mar._mer._jeu._ven._sam.".split("_"),
    weekdaysMin: "di_lu_ma_me_je_ve_sa".split("_"),
    weekdaysParseExact: true,
    longDateFormat: {
      LT: "HH:mm",
      LTS: "HH:mm:ss",
      L: "DD/MM/YYYY",
      LL: "D MMMM YYYY",
      LLL: "D MMMM YYYY HH:mm",
      LLLL: "dddd D MMMM YYYY HH:mm"
    },
    calendar: {
      sameDay: "[Aujourd’hui à] LT",
      nextDay: "[Demain à] LT",
      nextWeek: "dddd [à] LT",
      lastDay: "[Hier à] LT",
      lastWeek: "dddd [dernier à] LT",
      sameElse: "L"
    },
    relativeTime: {
      future: "dans %s",
      past: "il y a %s",
      s: "quelques secondes",
      ss: "%d secondes",
      m: "une minute",
      mm: "%d minutes",
      h: "une heure",
      hh: "%d heures",
      d: "un jour",
      dd: "%d jours",
      w: "une semaine",
      ww: "%d semaines",
      M: "un mois",
      MM: "%d mois",
      y: "un an",
      yy: "%d ans"
    },
    dayOfMonthOrdinalParse: /\d{1,2}(er|)/,
    ordinal: function (e, t) {
      switch (t) {
        case "D":
          return e + (e === 1 ? "er" : "");
        default:
        case "M":
        case "Q":
        case "DDD":
        case "d":
          return e + (e === 1 ? "er" : "e");
        case "w":
        case "W":
          return e + (e === 1 ? "re" : "e");
      }
    },
    week: {
      dow: 1,
      doy: 4
    }
  });
  return o;
});
};
