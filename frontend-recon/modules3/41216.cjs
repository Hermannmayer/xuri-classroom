// webpack module 41216 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = require("./52141.js");
var o = require("./15595.js");
var a = require("./11486.js");
var s = require("./75876.js");
var u = require("./71478.js");
var l = u.get;
var c = u.enforce;
var p = String(String).split("String");
(module.exports = function (e, t, r, s) {
  var u = !!s && !!s.unsafe;
  var l = !!s && !!s.enumerable;
  var d = !!s && !!s.noTargetGet;
  if (typeof r == "function") {
    if (typeof t == "string" && !o(r, "name")) {
      i(r, "name", t);
    }
    c(r).source = p.join(typeof t == "string" ? t : "");
  }
  if (e !== n) {
    if (u) {
      if (!d && e[t]) {
        l = true;
      }
    } else {
      delete e[t];
    }
    if (l) {
      e[t] = r;
    } else {
      i(e, t, r);
    }
  } else if (l) {
    e[t] = r;
  } else {
    a(t, r);
  }
})(Function.prototype, "toString", function () {
  return typeof this == "function" && l(this).source || s(this);
});
};
