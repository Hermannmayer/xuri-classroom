// webpack module 87809 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js");
var i = require("./28004.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;
var o = n(require("./38524.js"));
var a = n(require("./49277.js"));
var s = n(require("./14389.js"));
var u = n(require("./55287.js"));
var l = y(require("./59496.js"));
var c = n(require("./38399.js"));
var p = n(require("./2890.js"));
var d = n(require("./39549.js"));
var f = require("./5554.js");
var g = require("./80283.js");
var m = ["className", "icon", "spin", "rotate", "tabIndex", "onClick", "twoToneColor"];
function v(e) {
  if (typeof WeakMap != "function") {
    return null;
  }
  var t = new WeakMap();
  var r = new WeakMap();
  return (v = function (e) {
    if (e) {
      return r;
    } else {
      return t;
    }
  })(e);
}
function y(e, t) {
  if (!t && e && e.__esModule) {
    return e;
  }
  if (e === null || i(e) != "object" && typeof e != "function") {
    return {
      default: e
    };
  }
  var r = v(t);
  if (r && r.has(e)) {
    return r.get(e);
  }
  var n = {
    __proto__: null
  };
  var o = Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var a in e) {
    if (a !== "default" && {}.hasOwnProperty.call(e, a)) {
      var s = o ? Object.getOwnPropertyDescriptor(e, a) : null;
      if (s && (s.get || s.set)) {
        Object.defineProperty(n, a, s);
      } else {
        n[a] = e[a];
      }
    }
  }
  n.default = e;
  if (r) {
    r.set(e, n);
  }
  return n;
}
(0, f.setTwoToneColor)("#1890ff");
var h = l.forwardRef(function (e, t) {
  var r = e.className;
  var n = e.icon;
  var i = e.spin;
  var f = e.rotate;
  var v = e.tabIndex;
  var y = e.onClick;
  var h = e.twoToneColor;
  var b = (0, u.default)(e, m);
  var w = l.useContext(p.default);
  var x = w.prefixCls;
  var E = x === undefined ? "anticon" : x;
  var k = w.rootClassName;
  var S = (0, c.default)(k, E, (0, s.default)((0, s.default)({}, `${E}-${n.name}`, !!n.name), `${E}-spin`, !!i || n.name === "loading"), r);
  var T = v;
  if (T === undefined && y) {
    T = -1;
  }
  var C = f ? {
    msTransform: `rotate(${f}deg)`,
    transform: `rotate(${f}deg)`
  } : undefined;
  var A = (0, g.normalizeTwoToneColors)(h);
  var _ = (0, a.default)(A, 2);
  var O = _[0];
  var M = _[1];
  return l.createElement("span", (0, o.default)((0, o.default)({
    role: "img",
    "aria-label": n.name
  }, b), {}, {
    ref: t,
    tabIndex: T,
    onClick: y,
    className: S
  }), l.createElement(d.default, {
    icon: n,
    primaryColor: O,
    secondaryColor: M,
    style: C
  }));
});
h.displayName = "AntdIcon";
h.getTwoToneColor = f.getTwoToneColor;
h.setTwoToneColor = f.setTwoToneColor;
exports.default = h;
};
