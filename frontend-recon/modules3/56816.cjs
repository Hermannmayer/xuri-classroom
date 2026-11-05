// webpack module 56816 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./95051.js");
var o = require("./66845.js");
var a = require("./43719.js");
var s = [].join;
var u = i != Object;
var l = a("join", ",");
n({
  target: "Array",
  proto: true,
  forced: u || !l
}, {
  join: function (e) {
    return s.call(o(this), e === undefined ? "," : e);
  }
});
};
