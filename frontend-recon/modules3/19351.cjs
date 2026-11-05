// webpack module 19351 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./9920.js");
var i = require("./50252.js");
function o(e, t) {
  function r(i, o, a, s) {
    try {
      var u = e[i](o);
      var l = u.value;
      if (l instanceof n) {
        return t.resolve(l.v).then(function (e) {
          r("next", e, a, s);
        }, function (e) {
          r("throw", e, a, s);
        });
      } else {
        return t.resolve(l).then(function (e) {
          u.value = e;
          a(u);
        }, function (e) {
          return r("throw", e, a, s);
        });
      }
    } catch (e) {
      s(e);
    }
  }
  var a;
  if (!this.next) {
    i(o.prototype);
    i(o.prototype, typeof Symbol == "function" && Symbol.asyncIterator || "@asyncIterator", function () {
      return this;
    });
  }
  i(this, "_invoke", function (e, n, i) {
    function o() {
      return new t(function (t, n) {
        r(e, i, t, n);
      });
    }
    return a = a ? a.then(o, o) : o();
  }, true);
}
module.exports = o;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
