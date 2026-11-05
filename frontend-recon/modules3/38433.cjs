// webpack module 38433 — body from webcrack
module.exports = function (module, exports, require) {
function r(e, t) {
  if (!e) {
    return false;
  }
  if (e.contains) {
    return e.contains(t);
  }
  var r = t;
  while (r) {
    if (r === e) {
      return true;
    }
    r = r.parentNode;
  }
  return false;
}
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = r;
};
