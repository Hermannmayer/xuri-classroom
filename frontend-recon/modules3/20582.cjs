// webpack module 20582 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js");
var i = require("./4484.js");
var o = require("./24562.js");
var a = require("./41630.js");
var s = require("./27015.js");
var u = n.aTypedArray;
var l = n.exportTypedArrayMethod;
var c = s(function () {
  new Int8Array(1).set({});
});
l("set", function (e) {
  u(this);
  var t = o(arguments.length > 1 ? arguments[1] : undefined, 1);
  var r = this.length;
  var n = a(e);
  var s = i(n.length);
  var l = 0;
  if (s + t > r) {
    throw RangeError("Wrong length");
  }
  while (l < s) {
    this[t + l] = n[l++];
  }
}, c);
};
