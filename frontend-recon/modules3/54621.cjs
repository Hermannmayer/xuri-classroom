// webpack module 54621 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./79456.js");
var a = require("./60730.js");
n({
  target: "Map",
  proto: true,
  real: true,
  forced: i
}, {
  update: function (e, t) {
    var r = o(this);
    var n = arguments.length;
    a(t);
    var i = r.has(e);
    if (!i && n < 3) {
      throw TypeError("Updating absent value");
    }
    var s = i ? r.get(e) : a(n > 2 ? arguments[2] : undefined)(e, r);
    r.set(e, t(s, e, r));
    return r;
  }
});
};
