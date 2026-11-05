// webpack module 46011 — body from webcrack
module.exports = function (module, exports, require) {
function t(e) {
  var t = Object(e);
  var r = [];
  for (var n in t) {
    r.unshift(n);
  }
  return function e() {
    while (r.length) {
      if ((n = r.pop()) in t) {
        e.value = n;
        e.done = false;
        return e;
      }
    }
    e.done = true;
    return e;
  };
}
module.exports = t;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
