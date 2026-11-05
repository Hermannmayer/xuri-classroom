// webpack module 83721 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60511.js");
function i(e) {
  if (e < 60) {
    e += 1;
  }
  var t = Math.floor(e - 25569);
  var r = t * 86400;
  var n = new Date(r * 1000);
  var i = e - Math.floor(e) + 1e-7;
  var o = Math.floor(i * 86400);
  var a = o % 60;
  o -= a;
  var s = Math.floor(o / 3600);
  var u = Math.floor(o / 60) % 60;
  var l = n.getDate();
  var c = n.getMonth();
  if (e >= 60 && e < 61) {
    l = 29;
    c = 1;
  }
  return new Date(n.getFullYear(), c, l, s, u, a);
}
exports.flattenShallow = function (e) {
  if (e && e.reduce) {
    return e.reduce(function (e, t) {
      var r = Array.isArray(e);
      var n = Array.isArray(t);
      if (r && n) {
        return e.concat(t);
      } else if (r) {
        e.push(t);
        return e;
      } else if (n) {
        return [e].concat(t);
      } else {
        return [e, t];
      }
    });
  } else {
    return e;
  }
};
exports.isFlat = function (e) {
  if (!e) {
    return false;
  }
  for (var t = 0; t < e.length; ++t) {
    if (Array.isArray(e[t])) {
      return false;
    }
  }
  return true;
};
exports.flatten = function () {
  var e = exports.argsToArray.apply(null, arguments);
  while (!exports.isFlat(e)) {
    e = exports.flattenShallow(e);
  }
  return e;
};
exports.argsToArray = function (e) {
  var r = [];
  exports.arrayEach(e, function (e) {
    r.push(e);
  });
  return r;
};
exports.numbers = function () {
  var e = this.flatten.apply(null, arguments);
  return e.filter(function (e) {
    return typeof e === "number";
  });
};
exports.cleanFloat = function (e) {
  var t = 100000000000000;
  return Math.round(e * t) / t;
};
exports.parseBool = function (e) {
  if (typeof e === "boolean") {
    return e;
  }
  if (e instanceof Error) {
    return e;
  }
  if (typeof e === "number") {
    return e !== 0;
  }
  if (typeof e === "string") {
    var t = e.toUpperCase();
    if (t === "TRUE") {
      return true;
    }
    if (t === "FALSE") {
      return false;
    }
  }
  return e instanceof Date && !isNaN(e) || n.value;
};
exports.parseNumber = function (e) {
  if (e instanceof Error) {
    return e;
  } else if (e === undefined || e === null || e === "") {
    return 0;
  } else {
    if (typeof e === "boolean") {
      e = +e;
    }
    if (isNaN(e)) {
      return n.value;
    } else {
      return parseFloat(e);
    }
  }
};
exports.parseString = function (e) {
  if (e instanceof Error) {
    return e;
  } else if (e === undefined || e === null) {
    return "";
  } else {
    return e.toString();
  }
};
exports.parseNumberArray = function (e) {
  var r;
  var i;
  if (!e || (r = e.length) === 0) {
    return n.value;
  }
  while (r--) {
    if (e[r] instanceof Error) {
      return e[r];
    }
    i = exports.parseNumber(e[r]);
    if (i instanceof Error) {
      return i;
    }
    e[r] = i;
  }
  return e;
};
exports.parseMatrix = function (e) {
  var r;
  if (!e || e.length === 0) {
    return n.value;
  }
  for (var i = 0; i < e.length; i++) {
    r = exports.parseNumberArray(e[i]);
    e[i] = r;
    if (r instanceof Error) {
      return r;
    }
  }
  return e;
};
exports.parseDate = function (e) {
  if (!isNaN(e)) {
    if (e instanceof Date) {
      return new Date(e);
    }
    var t = parseFloat(e);
    if (t < 0 || t >= 2958466) {
      return n.num;
    } else {
      return i(t);
    }
  }
  if (typeof e !== "string" || (e = new Date(e), isNaN(e))) {
    return n.value;
  } else {
    return e;
  }
};
exports.parseDateArray = function (e) {
  var t;
  var r = e.length;
  while (r--) {
    t = this.parseDate(e[r]);
    if (t === n.value) {
      return t;
    }
    e[r] = t;
  }
  return e;
};
exports.anyError = function () {
  for (var e = 0; e < arguments.length; e++) {
    if (arguments[e] instanceof Error) {
      return arguments[e];
    }
  }
};
exports.isDefined = function (e) {
  return e !== undefined && e !== null;
};
exports.anyIsError = function () {
  var e = arguments.length;
  while (e--) {
    if (arguments[e] instanceof Error) {
      return true;
    }
  }
  return false;
};
exports.anyIsString = function () {
  var e = arguments.length;
  while (e--) {
    if (typeof arguments[e] === "string") {
      return true;
    }
  }
  return false;
};
exports.arrayValuesToNumbers = function (e) {
  var t;
  var r = e.length;
  while (r--) {
    t = e[r];
    if (typeof t !== "number") {
      if (t !== true) {
        if (t !== false) {
          if (typeof t === "string") {
            var n = this.parseNumber(t);
            if (n instanceof Error) {
              e[r] = 0;
            } else {
              e[r] = n;
            }
          }
        } else {
          e[r] = 0;
        }
      } else {
        e[r] = 1;
      }
    }
  }
  return e;
};
exports.rest = function (e, t) {
  t = t || 1;
  if (e && typeof e.slice === "function") {
    return e.slice(t);
  } else {
    return e;
  }
};
exports.initial = function (e, t) {
  t = t || 1;
  if (e && typeof e.slice === "function") {
    return e.slice(0, e.length - t);
  } else {
    return e;
  }
};
exports.arrayEach = function (e, t) {
  var r = -1;
  var n = e.length;
  while (++r < n) {
    if (t(e[r], r, e) === false) {
      break;
    }
  }
  return e;
};
exports.transpose = function (e) {
  if (e) {
    return e[0].map(function (t, r) {
      return e.map(function (e) {
        return e[r];
      });
    });
  } else {
    return n.value;
  }
};
};
