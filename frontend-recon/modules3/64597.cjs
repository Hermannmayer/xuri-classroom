// webpack module 64597 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;
var i = n(require("./55287.js"));
var o = n(require("./38524.js"));
var a = require("./97829.js");
var s = ["icon", "className", "onClick", "style", "primaryColor", "secondaryColor"];
var u = {
  primaryColor: "#333",
  secondaryColor: "#E6E6E6",
  calculated: false
};
function l(e) {
  var t = e.primaryColor;
  var r = e.secondaryColor;
  u.primaryColor = t;
  u.secondaryColor = r || (0, a.getSecondaryColor)(t);
  u.calculated = !!r;
}
function c() {
  return (0, o.default)({}, u);
}
function p(e) {
  var t = e.icon;
  var r = e.className;
  var n = e.onClick;
  var l = e.style;
  var c = e.primaryColor;
  var p = e.secondaryColor;
  var d = (0, i.default)(e, s);
  var f = u;
  if (c) {
    f = {
      primaryColor: c,
      secondaryColor: p || (0, a.getSecondaryColor)(c)
    };
  }
  (0, a.useInsertStyles)();
  (0, a.warning)((0, a.isIconDefinition)(t), `icon should be icon definiton, but got ${t}`);
  if (!(0, a.isIconDefinition)(t)) {
    return null;
  }
  var g = t;
  if (g && typeof g.icon === "function") {
    g = (0, o.default)((0, o.default)({}, g), {}, {
      icon: g.icon(f.primaryColor, f.secondaryColor)
    });
  }
  return (0, a.generate)(g.icon, `svg-${g.name}`, (0, o.default)({
    className: r,
    onClick: n,
    style: l,
    "data-icon": g.name,
    width: "1em",
    height: "1em",
    fill: "currentColor",
    "aria-hidden": "true"
  }, d));
}
p.displayName = "IconReact";
p.getTwoToneColors = c;
p.setTwoToneColors = l;
var d = p;
exports.default = d;
};
