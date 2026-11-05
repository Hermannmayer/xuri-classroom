// webpack module 21012 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;
var o = i(require("./90585.js"));
var a = i(require("./14389.js"));
var s = i(require("./38399.js"));
var u = n(require("./59496.js"));
var l = require("./96583.js");
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
function p(e) {
  var t = e.prefixCls;
  var r = e.className;
  var n = e.checked;
  var i = e.onChange;
  var p = e.onClick;
  var d = c(e, ["prefixCls", "className", "checked", "onChange", "onClick"]);
  var f = u.useContext(l.ConfigContext);
  var g = f.getPrefixCls;
  function m(e) {
    if (i !== null && i !== undefined) {
      i(!n);
    }
    if (p !== null && p !== undefined) {
      p(e);
    }
  }
  var v = g("tag", t);
  var y = (0, s.default)(v, (0, a.default)((0, a.default)({}, `${v}-checkable`, true), `${v}-checkable-checked`, n), r);
  return u.createElement("span", (0, o.default)({}, d, {
    className: y,
    onClick: m
  }));
}
exports.default = p;
};
