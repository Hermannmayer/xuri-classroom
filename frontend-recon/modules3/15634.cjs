// webpack module 15634 — body from webcrack
module.exports = function (module, exports, require) {
function t() {
  try {
    var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
  } catch (r) {}
  return (module.exports = t = function () {
    return !!r;
  }, module.exports.__esModule = true, module.exports.default = module.exports)();
}
module.exports = t;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
