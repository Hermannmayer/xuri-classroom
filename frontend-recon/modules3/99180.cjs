// webpack module 99180 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./5659.js");
var i = require("./49674.js");
var o = require("./55878.js");
var a = o("species");
module.exports = function (e, t) {
  var r;
  if (i(e)) {
    r = e.constructor;
    if (typeof r != "function" || r !== Array && !i(r.prototype)) {
      if (n(r)) {
        r = r[a];
        if (r === null) {
          r = undefined;
        }
      }
    } else {
      r = undefined;
    }
  }
  return new (r === undefined ? Array : r)(t === 0 ? 0 : t);
};
};
