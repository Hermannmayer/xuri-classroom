// webpack module 11610 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./98199.js");
var o = require("./60730.js");
n({
  target: "Map",
  stat: true
}, {
  groupBy: function (e, t) {
    var r = new this();
    o(t);
    var n = o(r.has);
    var a = o(r.get);
    var s = o(r.set);
    i(e, function (e) {
      var i = t(e);
      if (n.call(r, i)) {
        a.call(r, i).push(e);
      } else {
        s.call(r, i, [e]);
      }
    });
    return r;
  }
});
};
