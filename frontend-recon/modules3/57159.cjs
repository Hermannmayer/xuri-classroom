// webpack module 57159 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./79456.js");
var i = require("./5659.js");
var o = require("./13093.js");
module.exports = function (e, t) {
  n(e);
  if (i(t) && t.constructor === e) {
    return t;
  }
  var r = o.f(e);
  var a = r.resolve;
  a(t);
  return r.promise;
};
};
