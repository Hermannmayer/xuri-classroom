// webpack module 37937 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./40948.js");
var o = require("./79456.js");
var a = require("./54295.js");
var s = i.has;
var u = i.toKey;
function l(e, t, r) {
  var n = s(e, t, r);
  if (n) {
    return true;
  }
  var i = a(t);
  return i !== null && l(e, i, r);
}
n({
  target: "Reflect",
  stat: true
}, {
  hasMetadata: function (e, t) {
    var r = arguments.length < 3 ? undefined : u(arguments[2]);
    return l(e, o(t), r);
  }
});
};
