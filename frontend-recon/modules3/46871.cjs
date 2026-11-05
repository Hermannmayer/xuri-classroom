// webpack module 46871 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;
var i = n(require("./23973.js"));
var o = n(require("./96598.js"));
var a = n(require("./59496.js"));
function s() {
  return {
    width: 0,
    opacity: 0,
    transform: "scale(0)"
  };
}
function u(e) {
  return {
    width: e.scrollWidth,
    opacity: 1,
    transform: "scale(1)"
  };
}
function l(e) {
  var t = e.prefixCls;
  var r = e.loading;
  var n = e.existIcon;
  var l = !!r;
  if (n) {
    return a.default.createElement("span", {
      className: `${t}-loading-icon`
    }, a.default.createElement(i.default, null));
  } else {
    return a.default.createElement(o.default, {
      visible: l,
      motionName: `${t}-loading-icon-motion`,
      removeOnLeave: true,
      onAppearStart: s,
      onAppearActive: u,
      onEnterStart: s,
      onEnterActive: u,
      onLeaveStart: u,
      onLeaveActive: s
    }, function (e, r) {
      var n = e.className;
      var o = e.style;
      return a.default.createElement("span", {
        className: `${t}-loading-icon`,
        style: o,
        ref: r
      }, a.default.createElement(i.default, {
        className: n
      }));
    });
  }
}
exports.default = l;
};
