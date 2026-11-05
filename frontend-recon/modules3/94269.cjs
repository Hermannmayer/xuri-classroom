// webpack module 94269 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  J: function () {
    return s;
  }
});
var n = require("./34256.js");
var i = require("./59496.js");
function o(e, t) {
  var r = {};
  for (var n in e) {
    if (Object.prototype.hasOwnProperty.call(e, n) && t.indexOf(n) < 0) {
      r[n] = e[n];
    }
  }
  if (e != null && typeof Object.getOwnPropertySymbols === "function") {
    var i = 0;
    for (n = Object.getOwnPropertySymbols(e); i < n.length; i++) {
      if (t.indexOf(n[i]) < 0 && Object.prototype.propertyIsEnumerable.call(e, n[i])) {
        r[n[i]] = e[n[i]];
      }
    }
  }
  return r;
}
var a = i.createContext(null);
function s(e) {
  var t = e.children;
  var r = o(e, ["children"]);
  var s = i.useContext(a);
  var u = i.useMemo(function () {
    return (0, n.Z)((0, n.Z)({}, s), r);
  }, [s, r.prefixCls, r.mode, r.selectable]);
  return i.createElement(a.Provider, {
    value: u
  }, t);
}
exports.Z = a;
};
