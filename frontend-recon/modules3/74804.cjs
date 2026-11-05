// webpack module 74804 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./22365.js");
var i = require("./5659.js");
var o = require("./15595.js");
var a = require("./75386.js").f;
var s = require("./22319.js");
var u = require("./55073.js");
var l = s("meta");
var c = 0;
var p = Object.isExtensible || function () {
  return true;
};
function d(e) {
  a(e, l, {
    value: {
      objectID: "O" + ++c,
      weakData: {}
    }
  });
}
function f(e, t) {
  if (!i(e)) {
    if (typeof e == "symbol") {
      return e;
    } else {
      return (typeof e == "string" ? "S" : "P") + e;
    }
  }
  if (!o(e, l)) {
    if (!p(e)) {
      return "F";
    }
    if (!t) {
      return "E";
    }
    d(e);
  }
  return e[l].objectID;
}
function g(e, t) {
  if (!o(e, l)) {
    if (!p(e)) {
      return true;
    }
    if (!t) {
      return false;
    }
    d(e);
  }
  return e[l].weakData;
}
function m(e) {
  if (u && v.REQUIRED && p(e) && !o(e, l)) {
    d(e);
  }
  return e;
}
var v = module.exports = {
  REQUIRED: false,
  fastKey: f,
  getWeakData: g,
  onFreeze: m
};
n[l] = true;
};
