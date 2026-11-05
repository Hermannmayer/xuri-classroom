// webpack module 66611 — body from webcrack
module.exports = function (module, exports, require) {
var t = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;
function r(e) {
  return e.match(t) || [];
}
module.exports = r;
};
