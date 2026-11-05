// webpack module 75333 — body from webcrack
module.exports = function (module, exports, require) {
function r(e, t) {
  var r = e;
  for (var n = 0; n < t.length; n += 1) {
    if (r === null || r === undefined) {
      return;
    }
    r = r[t[n]];
  }
  return r;
}
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = r;
};
