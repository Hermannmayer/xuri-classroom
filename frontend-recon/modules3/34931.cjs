// webpack module 34931 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./41497.js");
var i = require("./2381.js");
var o = require("./15614.js");
var a = require("./79456.js");
module.exports = n("Reflect", "ownKeys") || function (e) {
  var t = i.f(a(e));
  var r = o.f;
  if (r) {
    return t.concat(r(e));
  } else {
    return t;
  }
};
};
