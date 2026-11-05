// webpack module 82012 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Popup: function () {
    return d;
  },
  default: function () {
    return m;
  }
});
var n = require("34256");
var i = require("75728");
var o = require("91613");
var a = require("37913");
var s = require("59496");
var u = require("8019");
var l = require("21486");
var c = require("38399");
var p = c;
function d(e) {
  var t = e.showArrow;
  var r = e.arrowContent;
  var n = e.children;
  var i = e.prefixCls;
  var o = e.id;
  var a = e.overlayInnerStyle;
  var u = e.className;
  var l = e.style;
  return s.createElement("div", {
    className: p(`${i}-content`, u),
    style: l
  }, t !== false && s.createElement("div", {
    className: `${i}-arrow`,
    key: "arrow"
  }, r), s.createElement("div", {
    className: `${i}-inner`,
    id: o,
    role: "tooltip",
    style: a
  }, typeof n === "function" ? n() : n));
}
function f(e, t) {
  var r = e.overlayClassName;
  var c = e.trigger;
  var p = c === undefined ? ["hover"] : c;
  var f = e.mouseEnterDelay;
  var g = f === undefined ? 0 : f;
  var m = e.mouseLeaveDelay;
  var v = m === undefined ? 0.1 : m;
  var y = e.overlayStyle;
  var h = e.prefixCls;
  var b = h === undefined ? "rc-tooltip" : h;
  var w = e.children;
  var x = e.onVisibleChange;
  var E = e.afterVisibleChange;
  var k = e.transitionName;
  var S = e.animation;
  var T = e.motion;
  var C = e.placement;
  var A = C === undefined ? "right" : C;
  var _ = e.align;
  var O = _ === undefined ? {} : _;
  var M = e.destroyTooltipOnHide;
  var P = M !== undefined && M;
  var q = e.defaultVisible;
  var N = e.getTooltipContainer;
  var R = e.overlayInnerStyle;
  var I = e.arrowContent;
  var j = e.overlay;
  var D = e.id;
  var L = e.showArrow;
  var F = (0, a.Z)(e, ["overlayClassName", "trigger", "mouseEnterDelay", "mouseLeaveDelay", "overlayStyle", "prefixCls", "children", "onVisibleChange", "afterVisibleChange", "transitionName", "animation", "motion", "placement", "align", "destroyTooltipOnHide", "defaultVisible", "getTooltipContainer", "overlayInnerStyle", "arrowContent", "overlay", "id", "showArrow"]);
  var Z = (0, s.useRef)(null);
  (0, s.useImperativeHandle)(t, function () {
    return Z.current;
  });
  var z = (0, o.Z)({}, F);
  if ("visible" in e) {
    z.popupVisible = e.visible;
  }
  function U() {
    return s.createElement(d, {
      showArrow: L,
      arrowContent: I,
      key: "content",
      prefixCls: b,
      id: D,
      overlayInnerStyle: R
    }, j);
  }
  var B = false;
  var V = false;
  if (typeof P === "boolean") {
    B = P;
  } else if (P && (0, i.Z)(P) === "object") {
    var H = P.keepParent;
    B = H === true;
    V = H === false;
  }
  return s.createElement(u.Z, (0, n.Z)({
    popupClassName: r,
    prefixCls: b,
    popup: U,
    action: p,
    builtinPlacements: l.C,
    popupPlacement: A,
    ref: Z,
    popupAlign: O,
    getPopupContainer: N,
    onPopupVisibleChange: x,
    afterPopupVisibleChange: E,
    popupTransitionName: k,
    popupAnimation: S,
    popupMotion: T,
    defaultPopupVisible: q,
    destroyPopupOnHide: B,
    autoDestroy: V,
    mouseLeaveDelay: v,
    popupStyle: y,
    mouseEnterDelay: g
  }, z), w);
}
var g = (0, s.forwardRef)(f);
var m = g;
};
