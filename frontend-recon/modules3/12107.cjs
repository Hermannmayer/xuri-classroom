// webpack module 12107 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = Math.asinh;
var o = Math.log;
var a = Math.sqrt;
function s(e) {
  if (isFinite(e = +e) && e != 0) {
    if (e < 0) {
      return -s(-e);
    } else {
      return o(e + a(e * e + 1));
    }
  } else {
    return e;
  }
}
n({
  target: "Math",
  stat: true,
  forced: !i || !(1 / i(0) > 0)
}, {
  asinh: s
});
};
