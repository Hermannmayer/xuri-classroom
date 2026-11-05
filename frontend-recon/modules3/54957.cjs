// webpack module 54957 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js");
var i = require("./40602.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;
var o = n(require("./38524.js"));
var a = n(require("./49277.js"));
var s = n(require("./14389.js"));
var u = n(require("./55287.js"));
var l = i(require("./59496.js"));
var c = n(require("./38399.js"));
var p = n(require("./58951.js"));
var d = n(require("./64597.js"));
var f = require("./47618.js");
var g = require("./97829.js");
var m = ["className", "icon", "spin", "rotate", "tabIndex", "onClick", "twoToneColor"];
(0, f.setTwoToneColor)("#1890ff");
var v = l.forwardRef(function (e, t) {
  var r;
  var n = e.className;
  var i = e.icon;
  var f = e.spin;
  var v = e.rotate;
  var y = e.tabIndex;
  var h = e.onClick;
  var b = e.twoToneColor;
  var w = (0, u.default)(e, m);
  var x = l.useContext(p.default);
  var E = x.prefixCls;
  var k = E === undefined ? "anticon" : E;
  var S = (0, c.default)(k, (r = {}, (0, s.default)(r, `${k}-${i.name}`, !!i.name), (0, s.default)(r, `${k}-spin`, !!f || i.name === "loading"), r), n);
  var T = y;
  if (T === undefined && h) {
    T = -1;
  }
  var C = v ? {
    msTransform: `rotate(${v}deg)`,
    transform: `rotate(${v}deg)`
  } : undefined;
  var A = (0, g.normalizeTwoToneColors)(b);
  var _ = (0, a.default)(A, 2);
  var O = _[0];
  var M = _[1];
  return l.createElement("span", (0, o.default)((0, o.default)({
    role: "img",
    "aria-label": i.name
  }, w), {}, {
    ref: t,
    tabIndex: T,
    onClick: h,
    className: S
  }), l.createElement(d.default, {
    icon: i,
    primaryColor: O,
    secondaryColor: M,
    style: C
  }));
});
v.displayName = "AntdIcon";
v.getTwoToneColor = f.getTwoToneColor;
v.setTwoToneColor = f.setTwoToneColor;
var y = v;
exports.default = y;
};
