// webpack module 93741 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./55477.js");
var o = require("./45438.js");
var a = require("./28445.js");
var s = i.process;
var u = a(s) == "process";
n({
  global: true,
  enumerable: true,
  noTargetGet: true
}, {
  queueMicrotask: function (e) {
    var t = u && s.domain;
    o(t ? t.bind(e) : e);
  }
});
};
