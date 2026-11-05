// webpack module 94641 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./92695.js");
var o = require("./30925.js");
var a = require("./41630.js");
var s = require("./45867.js");
var u = require("./54295.js");
var l = require("./37987.js").f;
if (i) {
  n({
    target: "Object",
    proto: true,
    forced: o
  }, {
    __lookupSetter__: function (e) {
      var t;
      var r = a(this);
      var n = s(e, true);
      do {
        if (t = l(r, n)) {
          return t.set;
        }
      } while (r = u(r));
    }
  });
}
};
