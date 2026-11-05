// webpack module 29475 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./40948.js");
var o = require("./79456.js");
var a = require("./54295.js");
var s = i.has;
var u = i.get;
var l = i.toKey;
function c(e, t, r) {
  var n = s(e, t, r);
  if (n) {
    return u(e, t, r);
  }
  var i = a(t);
  if (i !== null) {
    return c(e, i, r);
  } else {
    return undefined;
  }
}
n({
  target: "Reflect",
  stat: true
}, {
  getMetadata: function (e, t) {
    var r = arguments.length < 3 ? undefined : l(arguments[2]);
    return c(e, o(t), r);
  }
});
};
