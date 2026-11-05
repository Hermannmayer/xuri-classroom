// webpack module 35716 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./98199.js");
var o = require("./22175.js");
n({
  target: "Object",
  stat: true
}, {
  fromEntries: function (e) {
    var t = {};
    i(e, function (e, r) {
      o(t, e, r);
    }, undefined, true);
    return t;
  }
});
};
