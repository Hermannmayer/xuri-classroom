// webpack module 86275 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.GroupSizeContext = undefined;
var o = i(require("./90585.js"));
var a = i(require("./14389.js"));
var s = i(require("./38399.js"));
var u = n(require("./59496.js"));
var l = require("./96583.js");
i(require("./2410.js"));
function c(e, t) {
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
var p = exports.GroupSizeContext = u.createContext(undefined);
function d(e) {
  var t = u.useContext(l.ConfigContext);
  var r = t.getPrefixCls;
  var n = t.direction;
  var i = e.prefixCls;
  var d = e.size;
  var f = e.className;
  var g = c(e, ["prefixCls", "size", "className"]);
  var m = r("btn-group", i);
  var v = "";
  switch (d) {
    case "large":
      v = "lg";
      break;
    case "small":
      v = "sm";
      break;
    case "middle":
    case undefined:
      break;
    default:
  }
  var y = (0, s.default)(m, (0, a.default)((0, a.default)({}, `${m}-${v}`, v), `${m}-rtl`, n === "rtl"), f);
  return u.createElement(p.Provider, {
    value: d
  }, u.createElement("div", (0, o.default)({}, g, {
    className: y
  })));
}
exports.default = d;
};
