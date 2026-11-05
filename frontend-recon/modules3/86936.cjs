// webpack module 86936 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60511.js");
var i = require("./83721.js");
var o = require("./67539.js");
exports.AND = function () {
  for (var e = i.flatten(arguments), t = n.value, r = 0; r < e.length; r++) {
    if (e[r] instanceof Error) {
      return e[r];
    }
    if (e[r] !== undefined && e[r] !== null && typeof e[r] !== "string") {
      if (t === n.value) {
        t = true;
      }
      if (!e[r]) {
        t = false;
      }
    }
  }
  return t;
};
exports.CHOOSE = function () {
  if (arguments.length < 2) {
    return n.na;
  }
  var e = arguments[0];
  if (e < 1 || e > 254 || arguments.length < e + 1) {
    return n.value;
  } else {
    return arguments[e];
  }
};
exports.FALSE = function () {
  return false;
};
exports.IF = function (e, t, r) {
  if (e instanceof Error) {
    return e;
  } else {
    t = !(arguments.length >= 2) || t;
    if (t === undefined || t === null) {
      t = 0;
    }
    r = arguments.length === 3 && r;
    if (r === undefined || r === null) {
      r = 0;
    }
    if (e) {
      return t;
    } else {
      return r;
    }
  }
};
exports.IFS = function () {
  for (var e = 0; e < arguments.length / 2; e++) {
    if (arguments[e * 2]) {
      return arguments[e * 2 + 1];
    }
  }
  return n.na;
};
exports.IFERROR = function (e, t) {
  if (o.ISERROR(e)) {
    return t;
  } else {
    return e;
  }
};
exports.IFNA = function (e, t) {
  if (e === n.na) {
    return t;
  } else {
    return e;
  }
};
exports.NOT = function (e) {
  if (typeof e === "string") {
    return n.value;
  } else if (e instanceof Error) {
    return e;
  } else {
    return !e;
  }
};
exports.OR = function () {
  for (var e = i.flatten(arguments), t = n.value, r = 0; r < e.length; r++) {
    if (e[r] instanceof Error) {
      return e[r];
    }
    if (e[r] !== undefined && e[r] !== null && typeof e[r] !== "string") {
      if (t === n.value) {
        t = false;
      }
      if (e[r]) {
        t = true;
      }
    }
  }
  return t;
};
exports.TRUE = function () {
  return true;
};
exports.XOR = function () {
  for (var e = i.flatten(arguments), t = n.value, r = 0; r < e.length; r++) {
    if (e[r] instanceof Error) {
      return e[r];
    }
    if (e[r] !== undefined && e[r] !== null && typeof e[r] !== "string") {
      if (t === n.value) {
        t = 0;
      }
      if (e[r]) {
        t++;
      }
    }
  }
  if (t === n.value) {
    return t;
  } else {
    return !!(Math.floor(Math.abs(t)) & 1);
  }
};
exports.SWITCH = function () {
  var e;
  if (arguments.length > 0) {
    var t = arguments[0];
    var r = arguments.length - 1;
    var i = Math.floor(r / 2);
    var o = false;
    var a = r % 2 !== 0;
    var s = r % 2 === 0 ? null : arguments[arguments.length - 1];
    if (i) {
      for (var u = 0; u < i; u++) {
        if (t === arguments[u * 2 + 1]) {
          e = arguments[u * 2 + 2];
          o = true;
          break;
        }
      }
    }
    if (!o) {
      e = a ? s : n.na;
    }
  } else {
    e = n.value;
  }
  return e;
};
};
