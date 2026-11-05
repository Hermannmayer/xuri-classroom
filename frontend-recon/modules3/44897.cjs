// webpack module 44897 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60511.js");
var i = require("./83721.js");
exports.MATCH = function (e, t, r) {
  if (!e && !t) {
    return n.na;
  }
  if (arguments.length === 2) {
    r = 1;
  }
  if (!(t instanceof Array)) {
    return n.na;
  }
  t = i.flatten(t);
  if (r !== -1 && r !== 0 && r !== 1) {
    return n.na;
  }
  var o;
  var a;
  for (var s = 0; s < t.length; s++) {
    if (r === 1) {
      if (t[s] === e) {
        return s + 1;
      }
      if (t[s] < e) {
        if (a) {
          if (t[s] > a) {
            o = s + 1;
            a = t[s];
          }
        } else {
          o = s + 1;
          a = t[s];
        }
      }
    } else if (r === 0) {
      if (typeof e === "string") {
        e = e.replace(/\?/g, ".");
        if (t[s].toLowerCase().match(e.toLowerCase())) {
          return s + 1;
        }
      } else if (t[s] === e) {
        return s + 1;
      }
    } else if (r === -1) {
      if (t[s] === e) {
        return s + 1;
      }
      if (t[s] > e) {
        if (a) {
          if (t[s] < a) {
            o = s + 1;
            a = t[s];
          }
        } else {
          o = s + 1;
          a = t[s];
        }
      }
    }
  }
  return o || n.na;
};
exports.VLOOKUP = function (e, t, r, i) {
  if (!t || !r) {
    return n.na;
  }
  i = i !== 0 && i !== false;
  var o = n.na;
  var a = typeof e === "number";
  var s = false;
  for (var u = 0; u < t.length; u++) {
    var l = t[u];
    if (l[0] === e) {
      o = r < l.length + 1 ? l[r - 1] : n.ref;
      break;
    }
    if (!s && (a && i && l[0] <= e || i && typeof l[0] === "string" && l[0].localeCompare(e) < 0)) {
      o = r < l.length + 1 ? l[r - 1] : n.ref;
    }
    if (a && l[0] > e) {
      s = true;
    }
  }
  return o;
};
exports.HLOOKUP = function (e, r, n, o) {
  return exports.VLOOKUP(e, i.transpose(r), n, o);
};
exports.LOOKUP = function (e, t, r) {
  t = i.flatten(t);
  r = i.flatten(r);
  var o = typeof e === "number";
  var a = n.na;
  for (var s = 0; s < t.length; s++) {
    if (t[s] === e) {
      return r[s];
    }
    if (o && t[s] <= e || typeof t[s] === "string" && t[s].localeCompare(e) < 0) {
      a = r[s];
    } else if (o && t[s] > e) {
      return a;
    }
  }
  return a;
};
exports.INDEX = function (e, t, r) {
  var o = i.anyError(e, t, r);
  if (o) {
    return o;
  }
  if (!Array.isArray(e)) {
    return n.value;
  }
  var a = e.length > 0 && !Array.isArray(e[0]);
  if (a && !r) {
    r = t;
    t = 1;
  } else {
    r = r || 1;
    t = t || 1;
  }
  if (r < 0 || t < 0) {
    return n.value;
  } else if (a && t === 1 && r <= e.length) {
    return e[r - 1];
  } else if (t <= e.length && r <= e[t - 1].length) {
    return e[t - 1][r - 1];
  } else {
    return n.ref;
  }
};
};
