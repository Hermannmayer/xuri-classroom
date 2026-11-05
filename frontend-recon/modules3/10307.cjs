// webpack module 10307 — body from webcrack
module.exports = function (module, exports, require) {
var t = /\s/;
function r(e) {
  var r = e.length;
  while (r-- && t.test(e.charAt(r)));
  return r;
}
module.exports = r;
};
