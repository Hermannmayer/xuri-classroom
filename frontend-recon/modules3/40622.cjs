// webpack module 40622 — body from webcrack
module.exports = function (module, exports, require) {
var t = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
function r(e) {
  return t.test(e);
}
module.exports = r;
};
