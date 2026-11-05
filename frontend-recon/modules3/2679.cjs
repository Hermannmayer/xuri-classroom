// webpack module 2679 — body from webcrack
module.exports = function (module, exports, require) {
function r(e, t, r) {
  if (r !== undefined) {
    return r;
  } else if (e === "year" && t.lang.yearPlaceholder) {
    return t.lang.yearPlaceholder;
  } else if (e === "quarter" && t.lang.quarterPlaceholder) {
    return t.lang.quarterPlaceholder;
  } else if (e === "month" && t.lang.monthPlaceholder) {
    return t.lang.monthPlaceholder;
  } else if (e === "week" && t.lang.weekPlaceholder) {
    return t.lang.weekPlaceholder;
  } else if (e === "time" && t.timePickerLocale.placeholder) {
    return t.timePickerLocale.placeholder;
  } else {
    return t.lang.placeholder;
  }
}
function n(e, t, r) {
  if (r !== undefined) {
    return r;
  } else if (e === "year" && t.lang.yearPlaceholder) {
    return t.lang.rangeYearPlaceholder;
  } else if (e === "quarter" && t.lang.quarterPlaceholder) {
    return t.lang.rangeQuarterPlaceholder;
  } else if (e === "month" && t.lang.monthPlaceholder) {
    return t.lang.rangeMonthPlaceholder;
  } else if (e === "week" && t.lang.weekPlaceholder) {
    return t.lang.rangeWeekPlaceholder;
  } else if (e === "time" && t.timePickerLocale.placeholder) {
    return t.timePickerLocale.rangePlaceholder;
  } else {
    return t.lang.rangePlaceholder;
  }
}
function i(e, t) {
  var r = {
    adjustX: 1,
    adjustY: 1
  };
  switch (t) {
    case "bottomLeft":
      return {
        points: ["tl", "bl"],
        offset: [0, 4],
        overflow: r
      };
    case "bottomRight":
      return {
        points: ["tr", "br"],
        offset: [0, 4],
        overflow: r
      };
    case "topLeft":
      return {
        points: ["bl", "tl"],
        offset: [0, -4],
        overflow: r
      };
    case "topRight":
      return {
        points: ["br", "tr"],
        offset: [0, -4],
        overflow: r
      };
    default:
      return {
        points: e === "rtl" ? ["tr", "br"] : ["tl", "bl"],
        offset: [0, 4],
        overflow: r
      };
  }
}
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPlaceholder = r;
exports.getRangePlaceholder = n;
exports.transPlacement2DropdownAlign = i;
};
