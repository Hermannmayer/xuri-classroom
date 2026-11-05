// webpack module 94699 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./24012.js").exportTypedArrayMethod;
var i = require("./27015.js");
var o = require("./55477.js");
var a = o.Uint8Array;
var s = a && a.prototype || {};
var u = [].toString;
var l = [].join;
if (i(function () {
  u.call({});
})) {
  u = function () {
    return l.call(this);
  };
}
var c = s.toString != u;
n("toString", u, c);
};
