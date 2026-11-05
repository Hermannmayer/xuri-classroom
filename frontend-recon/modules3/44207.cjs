// webpack module 44207 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./75728.js");
var i = require("./68044.js");
function o(e, t, r = false) {
  var o = new Set();
  function a(e, t, s = 1) {
    var u = o.has(e);
    (0, i.ZP)(!u, "Warning: There may be circular references");
    if (u) {
      return false;
    }
    if (e === t) {
      return true;
    }
    if (r && s > 1) {
      return false;
    }
    o.add(e);
    var l = s + 1;
    if (Array.isArray(e)) {
      if (!Array.isArray(t) || e.length !== t.length) {
        return false;
      }
      for (var c = 0; c < e.length; c++) {
        if (!a(e[c], t[c], l)) {
          return false;
        }
      }
      return true;
    }
    if (e && t && (0, n.Z)(e) === "object" && (0, n.Z)(t) === "object") {
      var p = Object.keys(e);
      return p.length === Object.keys(t).length && p.every(function (r) {
        return a(e[r], t[r], l);
      });
    }
    return false;
  }
  return a(e, t);
}
exports.Z = o;
};
