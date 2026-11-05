// webpack module 46096 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./40948.js");
var o = require("./79456.js");
var a = i.toKey;
var s = i.set;
n({
  target: "Reflect",
  stat: true
}, {
  defineMetadata: function (e, t, r) {
    var n = arguments.length < 4 ? undefined : a(arguments[3]);
    s(e, t, o(r), n);
  }
});
};
