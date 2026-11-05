// webpack module 16148 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./41216.js");
var i = require("./79456.js");
var o = require("./27015.js");
var a = require("./57300.js");
var s = "toString";
var u = RegExp.prototype;
var l = u[s];
var c = o(function () {
  return l.call({
    source: "a",
    flags: "b"
  }) != "/a/b";
});
var p = l.name != s;
if (c || p) {
  n(RegExp.prototype, s, function () {
    var e = i(this);
    var t = String(e.source);
    var r = e.flags;
    var n = String(r === undefined && e instanceof RegExp && !("flags" in u) ? a.call(e) : r);
    return "/" + t + "/" + n;
  }, {
    unsafe: true
  });
}
};
