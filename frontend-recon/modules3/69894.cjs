// webpack module 69894 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./8148.js");
var o = require("./61230.js");
var a = require("./71478.js");
var s = require("./61859.js");
var u = s.codeAt;
var l = s.charAt;
var c = "String Iterator";
var p = a.set;
var d = a.getterFor(c);
var f = i(function (e) {
  p(this, {
    type: c,
    string: e,
    index: 0
  });
}, "String", function () {
  var e;
  var t = d(this);
  var r = t.string;
  var n = t.index;
  if (n >= r.length) {
    return {
      value: undefined,
      done: true
    };
  } else {
    e = l(r, n);
    t.index += e.length;
    return {
      value: {
        codePoint: u(e, 0),
        position: n
      },
      done: false
    };
  }
});
n({
  target: "String",
  proto: true
}, {
  codePoints: function () {
    return new f(String(o(this)));
  }
});
};
