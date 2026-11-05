// webpack module 84622 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./78426.js");
var o = require("./10904.js");
var a = "Invalid number representation";
var s = "Invalid radix";
var u = /^[\da-z]+$/;
n({
  target: "Number",
  stat: true
}, {
  fromString: function (e, t) {
    var r;
    var n;
    var l = 1;
    if (typeof e != "string") {
      throw TypeError(a);
    }
    if (!e.length) {
      throw SyntaxError(a);
    }
    if (e.charAt(0) == "-" && (l = -1, e = e.slice(1), !e.length)) {
      throw SyntaxError(a);
    }
    r = t === undefined ? 10 : i(t);
    if (r < 2 || r > 36) {
      throw RangeError(s);
    }
    if (!u.test(e) || (n = o(e, r)).toString(r) !== e) {
      throw SyntaxError(a);
    }
    return l * n;
  }
});
};
