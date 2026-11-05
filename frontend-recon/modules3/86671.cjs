// webpack module 86671 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./79456.js");
var o = require("./89792.js");
var a = require("./82369.js");
if (a) {
  n({
    target: "Reflect",
    stat: true
  }, {
    setPrototypeOf: function (e, t) {
      i(e);
      o(t);
      try {
        a(e, t);
        return true;
      } catch (r) {
        return false;
      }
    }
  });
}
};
