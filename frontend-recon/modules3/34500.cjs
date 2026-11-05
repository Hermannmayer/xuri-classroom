// webpack module 34500 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return a;
  }
});
var n = require("./59496.js");
var i = require("./87995.js");
function o(e) {
  return e instanceof HTMLElement || e instanceof SVGElement;
}
function a(e) {
  if (o(e)) {
    return e;
  } else if (e instanceof n.Component) {
    return i.findDOMNode(e);
  } else {
    return null;
  }
}
};
