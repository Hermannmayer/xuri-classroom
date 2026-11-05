// webpack module 4033 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  A: function () {
    return i;
  }
});
var n = require("./4637.js");
function i(e) {
  var t = e.prefix;
  var r = e.children;
  return (0, n.jsxs)("div", {
    className: "option-label-wrap",
    style: t ? {
      display: "flex",
      alignItems: "flex-start",
      minWidth: 0
    } : undefined,
    children: [t && (0, n.jsxs)("span", {
      className: "option-prefix",
      style: {
        flex: "none",
        marginInlineEnd: 4
      },
      "aria-label": `${t}.`,
      children: [t, "."]
    }), r]
  });
}
};
