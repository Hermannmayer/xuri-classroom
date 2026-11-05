// webpack module 9861 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./98199.js");
var o = require("./60730.js");
n({
  target: "Map",
  stat: true
}, {
  keyBy: function (e, t) {
    var r = new this();
    o(t);
    var n = o(r.set);
    i(e, function (e) {
      n.call(r, t(e), e);
    });
    return r;
  }
});
};
