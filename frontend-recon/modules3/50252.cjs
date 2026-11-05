// webpack module 50252 — body from webcrack
module.exports = function (module, exports, require) {
function t(r, n, i, o) {
  var a = Object.defineProperty;
  try {
    a({}, "", {});
  } catch (r) {
    a = 0;
  }
  module.exports = t = function (e, r, n, i) {
    function o(r, n) {
      t(e, r, function (e) {
        return this._invoke(r, n, e);
      });
    }
    if (r) {
      if (a) {
        a(e, r, {
          value: n,
          enumerable: !i,
          configurable: !i,
          writable: !i
        });
      } else {
        e[r] = n;
      }
    } else {
      o("next", 0);
      o("throw", 1);
      o("return", 2);
    }
  };
  module.exports.__esModule = true;
  module.exports.default = module.exports;
  t(r, n, i, o);
}
module.exports = t;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
