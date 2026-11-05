// webpack module 93803 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  uH: function () {
    return o;
  },
  RM: function () {
    return a;
  },
  uF: function () {
    return s;
  },
  eC: function () {
    return u;
  },
  I8: function () {
    return l;
  },
  Ub: function () {
    return c;
  },
  GZ: function () {
    return p;
  }
});
var n = require("./86343.js");
var i = {
  components: {},
  decorators: {},
  answerSheet: {},
  previews: {}
};
var o = "antd";
function a(e, t, r = o) {
  i.components[r] ||= {};
  i.components[r][e] = t;
}
function s(e, t, r = o) {
  i.previews[r] ||= {};
  i.previews[r][e] = t;
}
function u(e, t, r = o) {
  i.decorators[r] ||= {};
  i.decorators[r][e] = t;
}
function l(e, t) {
  return i.components[e][t];
}
function c(e, t) {
  return i.previews[e]?.[t] || n.MB;
}
function p(e, t) {
  return i.decorators[e][t];
}
};
