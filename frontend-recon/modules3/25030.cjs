// webpack module 25030 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Components = undefined;
exports.getTimeProps = p;
var i = n(require("./90585.js"));
var o = require("./32543.js");
var a = n(require("./55528.js"));
var s = n(require("./40730.js"));
var u = n(require("./87507.js"));
var l = n(require("./27941.js"));
exports.Components = {
  button: a.default,
  rangeItem: s.default
};
function c(e) {
  if (e) {
    if (Array.isArray(e)) {
      return e;
    } else {
      return [e];
    }
  } else {
    return [];
  }
}
function p(e) {
  var t = e.format;
  var r = e.picker;
  var n = e.showHour;
  var o = e.showMinute;
  var a = e.showSecond;
  var s = e.use12Hours;
  var u = c(t)[0];
  var l = (0, i.default)({}, e);
  if (u && typeof u === "string") {
    if (!u.includes("s") && a === undefined) {
      l.showSecond = false;
    }
    if (!u.includes("m") && o === undefined) {
      l.showMinute = false;
    }
    if (!u.includes("H") && !u.includes("h") && n === undefined) {
      l.showHour = false;
    }
    if ((u.includes("a") || u.includes("A")) && s === undefined) {
      l.use12Hours = true;
    }
  }
  if (r === "time") {
    return l;
  } else {
    if (typeof u === "function") {
      delete l.format;
    }
    return {
      showTime: l
    };
  }
}
(0, o.tuple)("bottomLeft", "bottomRight", "topLeft", "topRight");
function d(e) {
  var t = (0, l.default)(e);
  var r = t.DatePicker;
  var n = t.WeekPicker;
  var i = t.MonthPicker;
  var o = t.YearPicker;
  var a = t.TimePicker;
  var s = t.QuarterPicker;
  var c = (0, u.default)(e);
  var p = r;
  p.WeekPicker = n;
  p.MonthPicker = i;
  p.YearPicker = o;
  p.RangePicker = c;
  p.TimePicker = a;
  p.QuarterPicker = s;
  return p;
}
exports.default = d;
};
