// webpack module 71478 — body from webcrack
module.exports = function (module, exports, require) {
var n;
var i;
var o;
var a = require("./86042.js");
var s = require("./55477.js");
var u = require("./5659.js");
var l = require("./52141.js");
var c = require("./15595.js");
var p = require("./58098.js");
var d = require("./22365.js");
var f = s.WeakMap;
function g(e) {
  if (o(e)) {
    return i(e);
  } else {
    return n(e, {});
  }
}
function m(e) {
  return function (t) {
    var r;
    if (!u(t) || (r = i(t)).type !== e) {
      throw TypeError("Incompatible receiver, " + e + " required");
    }
    return r;
  };
}
if (a) {
  var v = new f();
  var y = v.get;
  var h = v.has;
  var b = v.set;
  n = function (e, t) {
    b.call(v, e, t);
    return t;
  };
  i = function (e) {
    return y.call(v, e) || {};
  };
  o = function (e) {
    return h.call(v, e);
  };
} else {
  var w = p("state");
  d[w] = true;
  n = function (e, t) {
    l(e, w, t);
    return t;
  };
  i = function (e) {
    if (c(e, w)) {
      return e[w];
    } else {
      return {};
    }
  };
  o = function (e) {
    return c(e, w);
  };
}
module.exports = {
  set: n,
  get: i,
  has: o,
  enforce: g,
  getterFor: m
};
};
