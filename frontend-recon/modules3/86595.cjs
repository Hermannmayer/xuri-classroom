// webpack module 86595 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = function e(t, r) {
  if (t === r) {
    return true;
  }
  if (t && r && typeof t == "object" && typeof r == "object") {
    if (t.constructor !== r.constructor) {
      return false;
    }
    var n;
    var i;
    var o;
    if (Array.isArray(t)) {
      n = t.length;
      if (n != r.length) {
        return false;
      }
      for (i = n; i-- !== 0;) {
        if (!e(t[i], r[i])) {
          return false;
        }
      }
      return true;
    }
    if (t.constructor === RegExp) {
      return t.source === r.source && t.flags === r.flags;
    }
    if (t.valueOf !== Object.prototype.valueOf) {
      return t.valueOf() === r.valueOf();
    }
    if (t.toString !== Object.prototype.toString) {
      return t.toString() === r.toString();
    }
    o = Object.keys(t);
    n = o.length;
    if (n !== Object.keys(r).length) {
      return false;
    }
    for (i = n; i-- !== 0;) {
      if (!Object.prototype.hasOwnProperty.call(r, o[i])) {
        return false;
      }
    }
    for (i = n; i-- !== 0;) {
      var a = o[i];
      if (!e(t[a], r[a])) {
        return false;
      }
    }
    return true;
  }
  return t !== t && r !== r;
};
};
