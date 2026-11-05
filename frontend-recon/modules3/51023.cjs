// webpack module 51023 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./40948.js");
var o = require("./79456.js");
var a = i.has;
var s = i.toKey;
n({
  target: "Reflect",
  stat: true
}, {
  hasOwnMetadata: function (e, t) {
    var r = arguments.length < 3 ? undefined : s(arguments[2]);
    return a(e, o(t), r);
  }
});
};
