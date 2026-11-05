// webpack module 28004 — body from webcrack
module.exports = function (module, exports, require) {
function t(r) {
  module.exports = t = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function (e) {
    return typeof e;
  } : function (e) {
    if (e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype) {
      return "symbol";
    } else {
      return typeof e;
    }
  };
  module.exports.__esModule = true;
  module.exports.default = module.exports;
  return t(r);
}
module.exports = t;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
