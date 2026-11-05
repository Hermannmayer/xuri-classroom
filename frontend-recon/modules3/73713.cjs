// webpack module 73713 — body from webcrack
module.exports = function (module, exports, require) {
var n;
var i;
var o;
var a = require("./54295.js");
var s = require("./52141.js");
var u = require("./15595.js");
var l = require("./55878.js");
var c = require("./57965.js");
var p = l("iterator");
var d = false;
function f() {
  return this;
}
if ([].keys) {
  o = [].keys();
  if ("next" in o) {
    i = a(a(o));
    if (i !== Object.prototype) {
      n = i;
    }
  } else {
    d = true;
  }
}
if (n == undefined) {
  n = {};
}
if (!c && !u(n, p)) {
  s(n, p, f);
}
module.exports = {
  IteratorPrototype: n,
  BUGGY_SAFARI_ITERATORS: d
};
};
