// webpack module 21227 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./40948.js");
var o = require("./79456.js");
var a = i.toKey;
var s = i.getMap;
var u = i.store;
n({
  target: "Reflect",
  stat: true
}, {
  deleteMetadata: function (e, t) {
    var r = arguments.length < 3 ? undefined : a(arguments[2]);
    var n = s(o(t), r, false);
    if (n === undefined || !n.delete(e)) {
      return false;
    }
    if (n.size) {
      return true;
    }
    var i = u.get(t);
    i.delete(r);
    return !!i.size || u.delete(t);
  }
});
};
