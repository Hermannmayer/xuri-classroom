// webpack module 93967 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./66845.js");
var i = require("./78426.js");
var o = require("./4484.js");
var a = require("./43719.js");
var s = require("./24396.js");
var u = Math.min;
var l = [].lastIndexOf;
var c = !!l && 1 / [1].lastIndexOf(1, -0) < 0;
var p = a("lastIndexOf");
var d = s("indexOf", {
  ACCESSORS: true,
  1: 0
});
var f = c || !p || !d;
module.exports = f ? function (e) {
  if (c) {
    return l.apply(this, arguments) || 0;
  }
  var t = n(this);
  var r = o(t.length);
  var a = r - 1;
  if (arguments.length > 1) {
    a = u(a, i(arguments[1]));
  }
  if (a < 0) {
    a = r + a;
  }
  for (; a >= 0; a--) {
    if (a in t && t[a] === e) {
      return a || 0;
    }
  }
  return -1;
} : l;
};
