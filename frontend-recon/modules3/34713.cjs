// webpack module 34713 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./79456.js");
var i = require("./60730.js");
module.exports = function () {
  var e;
  var t = n(this);
  var r = i(t.delete);
  var o = true;
  for (var a = 0, s = arguments.length; a < s; a++) {
    e = r.call(t, arguments[a]);
    o = o && e;
  }
  return !!o;
};
};
