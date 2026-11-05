// webpack module 2278 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./40948.js");
var o = require("./79456.js");
var a = i.keys;
var s = i.toKey;
n({
  target: "Reflect",
  stat: true
}, {
  getOwnMetadataKeys: function (e) {
    var t = arguments.length < 2 ? undefined : s(arguments[1]);
    return a(o(e), t);
  }
});
};
