// webpack module 56619 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ConfigContext = exports.ConfigConsumer = undefined;
exports.withConfigConsumer = c;
var o = i(require("./90585.js"));
var a = n(require("./59496.js"));
function s(e, t) {
  return t || (e ? `ant-${e}` : "ant");
}
var u = exports.ConfigContext = a.createContext({
  getPrefixCls: s
});
var l = exports.ConfigConsumer = u.Consumer;
function c(e) {
  return function (t) {
    function r(r) {
      return a.createElement(l, null, function (n) {
        var i = e.prefixCls;
        var s = n.getPrefixCls;
        var u = r.prefixCls;
        var l = s(i, u);
        return a.createElement(t, (0, o.default)({}, n, r, {
          prefixCls: l
        }));
      });
    }
    var n = t.constructor;
    if (!n || !n.displayName) {
      t.name;
    }
    return r;
  };
}
};
