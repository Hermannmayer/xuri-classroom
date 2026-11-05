// webpack module 40937 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  l$: function () {
    return i;
  },
  M2: function () {
    return o;
  },
  wm: function () {
    return a;
  },
  Tm: function () {
    return s;
  }
});
var n = require("./59496.js");
var i = n.isValidElement;
function o(e) {
  return e && i(e) && e.type === n.Fragment;
}
function a(e, t, r) {
  if (i(e)) {
    return n.cloneElement(e, typeof r === "function" ? r(e.props || {}) : r);
  } else {
    return t;
  }
}
function s(e, t) {
  return a(e, e, t);
}
};
