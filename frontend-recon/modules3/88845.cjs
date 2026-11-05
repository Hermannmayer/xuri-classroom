// webpack module 88845 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./79456.js");
var o = require("./37987.js").f;
n({
  target: "Reflect",
  stat: true
}, {
  deleteProperty: function (e, t) {
    var r = o(i(e), t);
    return (!r || !!r.configurable) && delete e[t];
  }
});
};
