// webpack module 33708 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./66845.js");
var o = require("./4484.js");
n({
  target: "String",
  stat: true
}, {
  raw: function (e) {
    var t = i(e.raw);
    var r = o(t.length);
    var n = arguments.length;
    var a = [];
    var s = 0;
    while (r > s) {
      a.push(String(t[s++]));
      if (s < n) {
        a.push(String(arguments[s]));
      }
    }
    return a.join("");
  }
});
};
