// webpack module 52520 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  E_: function () {
    return a;
  },
  C: function () {
    return s;
  },
  PG: function () {
    return u;
  }
});
var n = require("./34256.js");
var i = require("./59496.js");
function o(e, t) {
  return t || (e ? `ant-${e}` : "ant");
}
var a = i.createContext({
  getPrefixCls: o
});
var s = a.Consumer;
function u(e) {
  return function (t) {
    function r(r) {
      return i.createElement(s, null, function (o) {
        var a = e.prefixCls;
        var s = o.getPrefixCls;
        var u = r.prefixCls;
        var l = s(a, u);
        return i.createElement(t, (0, n.Z)({}, o, r, {
          prefixCls: l
        }));
      });
    }
    var o = t.constructor;
    if (!o || !o.displayName) {
      t.name;
    }
    return r;
  };
}
};
