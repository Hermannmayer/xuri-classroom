// webpack module 19078 — body from webcrack
module.exports = function (module, exports, require) {
exports.Z = function (e) {
  if (!e) {
    return false;
  }
  if (e instanceof Element) {
    if (e.offsetParent) {
      return true;
    }
    if (e.getBBox) {
      var t = e.getBBox();
      var r = t.width;
      var n = t.height;
      if (r || n) {
        return true;
      }
    }
    if (e.getBoundingClientRect) {
      var i = e.getBoundingClientRect();
      var o = i.width;
      var a = i.height;
      if (o || a) {
        return true;
      }
    }
  }
  return false;
};
};
