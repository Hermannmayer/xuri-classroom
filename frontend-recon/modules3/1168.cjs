// webpack module 1168 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./5659.js");
var i = require("./75386.js");
var o = require("./54295.js");
var a = require("./55878.js");
var s = a("hasInstance");
var u = Function.prototype;
if (!(s in u)) {
  i.f(u, s, {
    value: function (e) {
      if (typeof this != "function" || !n(e)) {
        return false;
      }
      if (!n(this.prototype)) {
        return e instanceof this;
      }
      while (e = o(e)) {
        if (this.prototype === e) {
          return true;
        }
      }
      return false;
    }
  });
}
};
