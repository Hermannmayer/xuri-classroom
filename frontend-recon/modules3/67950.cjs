// webpack module 67950 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return c;
  }
});
var n = require("./91613.js");
var i = require("./59496.js");
var o = {
  icon: {
    tag: "svg",
    attrs: {
      viewBox: "64 64 896 896",
      focusable: "false"
    },
    children: [{
      tag: "path",
      attrs: {
        d: "M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm32 664c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V456c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272zm-32-344a48.01 48.01 0 010-96 48.01 48.01 0 010 96z"
      }
    }]
  },
  name: "info-circle",
  theme: "filled"
};
var a = o;
var s = require("./18268.js");
function u(e, t) {
  return i.createElement(s.Z, (0, n.Z)((0, n.Z)({}, e), {}, {
    ref: t,
    icon: a
  }));
}
var l = i.forwardRef(u);
var c = l;
};
