// webpack module 86975 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = s;
var i = n(require("./52288.js"));
var o = 0;
var a = {};
function s(e, t = 1) {
  var r = o++;
  var n = t;
  function s() {
    n -= 1;
    if (n <= 0) {
      e();
      delete a[r];
    } else {
      a[r] = (0, i.default)(s);
    }
  }
  a[r] = (0, i.default)(s);
  return r;
}
s.cancel = function (e) {
  if (e !== undefined) {
    i.default.cancel(a[e]);
    delete a[e];
  }
};
s.ids = a;
};
