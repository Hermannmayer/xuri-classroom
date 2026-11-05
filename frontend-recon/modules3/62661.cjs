// webpack module 62661 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  tS: function () {
    return a;
  }
});
var n = require("./66439.js");
var i = require("./19078.js");
function o(e, t = false) {
  if ((0, i.Z)(e)) {
    var r = e.nodeName.toLowerCase();
    var n = ["input", "select", "textarea", "button"].includes(r) || e.isContentEditable || r === "a" && !!e.getAttribute("href");
    var o = e.getAttribute("tabindex");
    var a = Number(o);
    var s = null;
    if (o && !Number.isNaN(a)) {
      s = a;
    } else if (n && s === null) {
      s = 0;
    }
    if (n && e.disabled) {
      s = null;
    }
    return s !== null && (s >= 0 || t && s < 0);
  }
  return false;
}
function a(e, t = false) {
  var r = (0, n.Z)(e.querySelectorAll("*")).filter(function (e) {
    return o(e, t);
  });
  if (o(e, t)) {
    r.unshift(e);
  }
  return r;
}
};
