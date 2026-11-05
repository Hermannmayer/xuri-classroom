// webpack module 45066 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./29477.js");
var o = String.fromCharCode;
var a = String.fromCodePoint;
var s = !!a && a.length != 1;
n({
  target: "String",
  stat: true,
  forced: s
}, {
  fromCodePoint: function (e) {
    var t;
    var r = [];
    var n = arguments.length;
    var a = 0;
    while (n > a) {
      t = +arguments[a++];
      if (i(t, 1114111) !== t) {
        throw RangeError(t + " is not a valid code point");
      }
      r.push(t < 65536 ? o(t) : o(55296 + ((t -= 65536) >> 10), t % 1024 + 56320));
    }
    return r.join("");
  }
});
};
