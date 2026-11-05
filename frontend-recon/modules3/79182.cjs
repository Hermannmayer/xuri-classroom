// webpack module 79182 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./61859.js").codeAt;
n({
  target: "String",
  proto: true
}, {
  codePointAt: function (e) {
    return i(this, e);
  }
});
};
