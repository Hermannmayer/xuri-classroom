// webpack module 32755 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./83721.js");
var i = require("./60511.js");
exports.UNIQUE = function () {
  var e = [];
  for (var t = 0; t < arguments.length; ++t) {
    var r = false;
    var n = arguments[t];
    for (var i = 0; i < e.length; ++i) {
      r = e[i] === n;
      if (r) {
        break;
      }
    }
    if (!r) {
      e.push(n);
    }
  }
  return e;
};
exports.FLATTEN = n.flatten;
exports.ARGS2ARRAY = function () {
  return Array.prototype.slice.call(arguments, 0);
};
exports.REFERENCE = function (e, t) {
  if (!arguments.length) {
    return i.error;
  }
  try {
    for (var r = t.split("."), n = e, o = 0; o < r.length; ++o) {
      var a = r[o];
      if (a[a.length - 1] === "]") {
        var s = a.indexOf("[");
        var u = a.substring(s + 1, a.length - 1);
        n = n[a.substring(0, s)][u];
      } else {
        n = n[a];
      }
    }
    return n;
  } catch (i) {}
};
exports.JOIN = function (e, t) {
  return e.join(t);
};
exports.NUMBERS = function () {
  var e = n.flatten(arguments);
  return e.filter(function (e) {
    return typeof e === "number";
  });
};
};
