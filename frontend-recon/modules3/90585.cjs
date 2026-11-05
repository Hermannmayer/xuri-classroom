// webpack module 90585 — body from webcrack
module.exports = function (module, exports, require) {
function t() {
  module.exports = t = Object.assign ? Object.assign.bind() : function (e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r) {
        if ({}.hasOwnProperty.call(r, n)) {
          e[n] = r[n];
        }
      }
    }
    return e;
  };
  module.exports.__esModule = true;
  module.exports.default = module.exports;
  return t.apply(null, arguments);
}
module.exports = t;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
