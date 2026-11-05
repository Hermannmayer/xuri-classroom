// webpack module 1942 — body from webcrack
module.exports = function (module, exports, require) {
(function (t, r) {
  module.exports = r();
})(0, function () {
  "use strict";

  return function (e, t) {
    t.prototype.weekYear = function () {
      var e = this.month();
      var t = this.week();
      var r = this.year();
      if (t === 1 && e === 11) {
        return r + 1;
      } else if (e === 0 && t >= 52) {
        return r - 1;
      } else {
        return r;
      }
    };
  };
});
};
