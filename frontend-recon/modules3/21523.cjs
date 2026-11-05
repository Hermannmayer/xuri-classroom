// webpack module 21523 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./83721.js");
var i = require("./60511.js");
exports.ASC = function () {
  throw new Error("ASC is not implemented");
};
exports.BAHTTEXT = function () {
  throw new Error("BAHTTEXT is not implemented");
};
exports.CHAR = function (e) {
  e = n.parseNumber(e);
  if (e === 0) {
    return i.value;
  } else if (e instanceof Error) {
    return e;
  } else {
    return String.fromCharCode(e);
  }
};
exports.CLEAN = function (e) {
  if (n.anyIsError(e)) {
    return e;
  }
  e = e || "";
  var t = /[\0-\x1F]/g;
  return e.replace(t, "");
};
exports.CODE = function (e) {
  if (n.anyIsError(e)) {
    return e;
  }
  e = e || "";
  var t = e.charCodeAt(0);
  if (isNaN(t)) {
    t = i.value;
  }
  return t;
};
exports.CONCATENATE = function () {
  var e = n.flatten(arguments);
  var t = n.anyError.apply(undefined, e);
  if (t) {
    return t;
  }
  var r = 0;
  while ((r = e.indexOf(true)) > -1) {
    e[r] = "TRUE";
  }
  var i = 0;
  while ((i = e.indexOf(false)) > -1) {
    e[i] = "FALSE";
  }
  return e.join("");
};
exports.CONCAT = exports.CONCATENATE;
exports.DBCS = function () {
  throw new Error("DBCS is not implemented");
};
exports.DOLLAR = function () {
  throw new Error("DOLLAR is not implemented");
};
exports.EXACT = function (e, t) {
  if (arguments.length !== 2) {
    return i.na;
  }
  var r = n.anyError(e, t);
  return r || (e = n.parseString(e), t = n.parseString(t), e === t);
};
exports.FIND = function (e, t, r) {
  if (arguments.length < 2) {
    return i.na;
  }
  e = n.parseString(e);
  t = n.parseString(t);
  r = r === undefined ? 0 : r;
  var o = t.indexOf(e, r - 1);
  if (o === -1) {
    return i.value;
  } else {
    return o + 1;
  }
};
exports.FIXED = function () {
  throw new Error("FIXED is not implemented");
};
exports.HTML2TEXT = function (e) {
  if (n.anyIsError(e)) {
    return e;
  }
  var t = "";
  if (e) {
    if (e instanceof Array) {
      e.forEach(function (e) {
        if (t !== "") {
          t += "\n";
        }
        t += e.replace(/<(?:.|\n)*?>/gm, "");
      });
    } else {
      t = e.replace(/<(?:.|\n)*?>/gm, "");
    }
  }
  return t;
};
exports.LEFT = function (e, t) {
  var r = n.anyError(e, t);
  return r || (e = n.parseString(e), t = t === undefined ? 1 : t, t = n.parseNumber(t), t instanceof Error || typeof e !== "string" ? i.value : e.substring(0, t));
};
exports.LEN = function (e) {
  if (arguments.length === 0) {
    return i.error;
  }
  if (e instanceof Error) {
    return e;
  }
  if (Array.isArray(e)) {
    return i.value;
  }
  var t = n.parseString(e);
  return t.length;
};
exports.LOWER = function (e) {
  if (arguments.length !== 1) {
    return i.value;
  } else {
    e = n.parseString(e);
    if (n.anyIsError(e)) {
      return e;
    } else {
      return e.toLowerCase();
    }
  }
};
exports.MID = function (e, t, r) {
  if (t === undefined || t === null) {
    return i.value;
  }
  t = n.parseNumber(t);
  r = n.parseNumber(r);
  if (n.anyIsError(t, r) || typeof e !== "string") {
    return r;
  }
  var o = t - 1;
  var a = o + r;
  return e.substring(o, a);
};
exports.NUMBERVALUE = function (e, t, r) {
  t = typeof t === "undefined" ? "." : t;
  r = typeof r === "undefined" ? "," : r;
  return Number(e.replace(t, ".").replace(r, ""));
};
exports.PRONETIC = function () {
  throw new Error("PRONETIC is not implemented");
};
exports.PROPER = function (e) {
  if (n.anyIsError(e)) {
    return e;
  } else if (isNaN(e) && typeof e === "number") {
    return i.value;
  } else {
    e = n.parseString(e);
    return e.replace(/\w\S*/g, function (e) {
      return e.charAt(0).toUpperCase() + e.substr(1).toLowerCase();
    });
  }
};
exports.REGEXEXTRACT = function (e, t) {
  if (arguments.length < 2) {
    return i.na;
  }
  var r = e.match(new RegExp(t));
  if (r) {
    return r[r.length > 1 ? r.length - 1 : 0];
  } else {
    return null;
  }
};
exports.REGEXMATCH = function (e, t, r) {
  if (arguments.length < 2) {
    return i.na;
  }
  var n = e.match(new RegExp(t));
  if (r) {
    return n;
  } else {
    return !!n;
  }
};
exports.REGEXREPLACE = function (e, t, r) {
  if (arguments.length < 3) {
    return i.na;
  } else {
    return e.replace(new RegExp(t), r);
  }
};
exports.REPLACE = function (e, t, r, o) {
  t = n.parseNumber(t);
  r = n.parseNumber(r);
  if (n.anyIsError(t, r) || typeof e !== "string" || typeof o !== "string") {
    return i.value;
  } else {
    return e.substr(0, t - 1) + o + e.substr(t - 1 + r);
  }
};
exports.REPT = function (e, t) {
  var r = n.anyError(e, t);
  return r || (e = n.parseString(e), t = n.parseNumber(t), t instanceof Error ? t : new Array(t + 1).join(e));
};
exports.RIGHT = function (e, t) {
  var r = n.anyError(e, t);
  return r || (e = n.parseString(e), t = t === undefined ? 1 : t, t = n.parseNumber(t), t instanceof Error ? t : e.substring(e.length - t));
};
exports.SEARCH = function (e, t, r) {
  var n;
  if (typeof e !== "string" || typeof t !== "string") {
    return i.value;
  } else {
    r = r === undefined ? 0 : r;
    n = t.toLowerCase().indexOf(e.toLowerCase(), r - 1) + 1;
    if (n === 0) {
      return i.value;
    } else {
      return n;
    }
  }
};
exports.SPLIT = function (e, t) {
  return e.split(t);
};
exports.SUBSTITUTE = function (e, t, r, n) {
  if (arguments.length < 3) {
    return i.na;
  }
  if (e && t) {
    if (n === undefined) {
      return e.split(t).join(r);
    }
    n = Math.floor(Number(n));
    if (Number.isNaN(n) || n <= 0) {
      return i.value;
    }
    var o = 0;
    var a = 0;
    while (o > -1 && e.indexOf(t, o) > -1) {
      o = e.indexOf(t, o + 1);
      a++;
      if (o > -1 && a === n) {
        return e.substring(0, o) + r + e.substring(o + t.length);
      }
    }
    return e;
  }
  return e;
};
exports.T = function (e) {
  if (e instanceof Error || typeof e === "string") {
    return e;
  } else {
    return "";
  }
};
exports.TEXT = function () {
  throw new Error("TEXT is not implemented");
};
exports.TRIM = function (e) {
  e = n.parseString(e);
  if (e instanceof Error) {
    return e;
  } else {
    return e.replace(/\s+/g, " ").trim();
  }
};
exports.UNICHAR = exports.CHAR;
exports.UNICODE = exports.CODE;
exports.UPPER = function (e) {
  e = n.parseString(e);
  if (e instanceof Error) {
    return e;
  } else {
    return e.toUpperCase();
  }
};
exports.VALUE = function (e) {
  var t = n.anyError(e);
  if (t) {
    return t;
  }
  if (typeof e !== "string") {
    return i.value;
  }
  var r = /(%)$/.test(e) || /^(%)/.test(e);
  e = e.replace(/^[^0-9-]{0,3}/, "");
  e = e.replace(/[^0-9]{0,3}$/, "");
  e = e.replace(/[\ ,]/g, "");
  if (e === "") {
    return i.value;
  }
  var o = Number(e);
  if (isNaN(o)) {
    return i.value;
  } else {
    o = o || 0;
    if (r) {
      o *= 0.01;
    }
    return o;
  }
};
};
