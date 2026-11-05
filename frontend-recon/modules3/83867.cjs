// webpack module 83867 — body from webcrack
module.exports = function (module, exports, require) {
(function (t, r) {
  module.exports = r();
})(0, function () {
  "use strict";

  var e = "week";
  var t = "year";
  return function (r, n, i) {
    var o = n.prototype;
    o.week = function (r = null) {
      if (r !== null) {
        return this.add((r - this.week()) * 7, "day");
      }
      var n = this.$locale().yearStart || 1;
      if (this.month() === 11 && this.date() > 25) {
        var o = i(this).startOf(t).add(1, t).date(n);
        var a = i(this).endOf(e);
        if (o.isBefore(a)) {
          return 1;
        }
      }
      var s = i(this).startOf(t).date(n).startOf(e).subtract(1, "millisecond");
      var u = this.diff(s, e, true);
      if (u < 0) {
        return i(this).startOf("week").week();
      } else {
        return Math.ceil(u);
      }
    };
    o.weeks = function (e = null) {
      return this.week(e);
    };
  };
});
};
