// webpack module 43070 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./27015.js");
var o = require("./67702.js");
var a = require("./79456.js");
var s = require("./29477.js");
var u = require("./4484.js");
var l = require("./51052.js");
var c = o.ArrayBuffer;
var p = o.DataView;
var d = c.prototype.slice;
var f = i(function () {
  return !new c(2).slice(1, undefined).byteLength;
});
n({
  target: "ArrayBuffer",
  proto: true,
  unsafe: true,
  forced: f
}, {
  slice: function (e, t) {
    if (d !== undefined && t === undefined) {
      return d.call(a(this), e);
    }
    var r = a(this).byteLength;
    var n = s(e, r);
    var i = s(t === undefined ? r : t, r);
    var o = new (l(this, c))(u(i - n));
    var f = new p(this);
    var g = new p(o);
    var m = 0;
    while (n < i) {
      g.setUint8(m++, f.getUint8(n++));
    }
    return o;
  }
});
};
