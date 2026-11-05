// webpack module 2824 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  mL: function () {
    return c;
  },
  q0: function () {
    return l;
  }
});
var n = require("./57431.js");
function i() {
  return {
    height: 0,
    opacity: 0
  };
}
function o(e) {
  var t = e.scrollHeight;
  return {
    height: t,
    opacity: 1
  };
}
function a(e) {
  return {
    height: e ? e.offsetHeight : 0
  };
}
function s(e, t) {
  return t?.deadline === true || t.propertyName === "height";
}
var u = {
  motionName: "ant-motion-collapse",
  onAppearStart: i,
  onEnterStart: i,
  onAppearActive: o,
  onEnterActive: o,
  onLeaveStart: a,
  onLeaveActive: i,
  onAppearEnd: s,
  onEnterEnd: s,
  onLeaveEnd: s,
  motionDeadline: 500
};
(0, n.b)("bottomLeft", "bottomRight", "topLeft", "topRight");
function l(e) {
  if (e === undefined || e !== "topLeft" && e !== "topRight") {
    return "slide-up";
  } else {
    return "slide-down";
  }
}
function c(e, t, r) {
  if (r !== undefined) {
    return r;
  } else {
    return `${e}-${t}`;
  }
}
exports.ZP = u;
};
