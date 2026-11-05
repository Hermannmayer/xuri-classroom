// webpack module 68102 — body from webcrack
module.exports = function (module, exports, require) {
(function (t, r) {
  module.exports = r();
})(0, function () {
  "use strict";

  return function (e, t) {
    t.prototype.weekday = function (e) {
      var t = this.$locale().weekStart || 0;
      var r = this.$W;
      var n = (r < t ? r + 7 : r) - t;
      if (this.$utils().u(e)) {
        return n;
      } else {
        return this.subtract(n, "day").add(e, "day");
      }
    };
  };
});
};
