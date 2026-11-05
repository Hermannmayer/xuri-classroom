// webpack module 24659 — body from webcrack
module.exports = function (module, exports, require) {
(function (t, r) {
  module.exports = r();
})(0, function () {
  "use strict";

  return function (e, t, r) {
    t.prototype.isBetween = function (e, t, n, i) {
      var o = r(e);
      var a = r(t);
      var s = (i = i || "()")[0] === "(";
      var u = i[1] === ")";
      return (s ? this.isAfter(o, n) : !this.isBefore(o, n)) && (u ? this.isBefore(a, n) : !this.isAfter(a, n)) || (s ? this.isBefore(o, n) : !this.isAfter(o, n)) && (u ? this.isAfter(a, n) : !this.isBefore(a, n));
    };
  };
});
};
