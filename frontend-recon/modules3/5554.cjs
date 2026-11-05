// webpack module 5554 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getTwoToneColor = u;
exports.setTwoToneColor = s;
var i = n(require("./49277.js"));
var o = n(require("./39549.js"));
var a = require("./80283.js");
function s(e) {
  var t = (0, a.normalizeTwoToneColors)(e);
  var r = (0, i.default)(t, 2);
  var n = r[0];
  var s = r[1];
  return o.default.setTwoToneColors({
    primaryColor: n,
    secondaryColor: s
  });
}
function u() {
  var e = o.default.getTwoToneColors();
  if (e.calculated) {
    return [e.primaryColor, e.secondaryColor];
  } else {
    return e.primaryColor;
  }
}
};
