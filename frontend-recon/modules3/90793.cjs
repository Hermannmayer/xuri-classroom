// webpack module 90793 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ANT_MARK = undefined;
var o = i(require("./90585.js"));
var a = n(require("./59496.js"));
i(require("./2410.js"));
var s = require("./93507.js");
var u = i(require("./85020.js"));
exports.ANT_MARK = "internalMark";
function l(e) {
  var t = e.locale;
  var r = t === undefined ? {} : t;
  var n = e.children;
  e._ANT_MARK__;
  a.useEffect(function () {
    (0, s.changeConfirmLocale)(r && r.Modal);
    return function () {
      (0, s.changeConfirmLocale)();
    };
  }, [r]);
  var i = a.useMemo(function () {
    return (0, o.default)((0, o.default)({}, r), {
      exist: true
    });
  }, [r]);
  return a.createElement(u.default.Provider, {
    value: i
  }, n);
}
exports.default = l;
};
