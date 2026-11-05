// webpack module 18753 — body from webcrack
module.exports = function (module, exports, require) {
function t(e, t) {
  if (e == null) {
    return {};
  }
  var r = {};
  for (var n in e) {
    if ({}.hasOwnProperty.call(e, n)) {
      if (t.indexOf(n) !== -1) {
        continue;
      }
      r[n] = e[n];
    }
  }
  return r;
}
module.exports = t;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
