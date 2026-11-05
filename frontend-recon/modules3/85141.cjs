// webpack module 85141 — body from webcrack
module.exports = function (module, exports, require) {
function t(e, t) {
  if (e === t) {
    return true;
  }
  if (!e || !t) {
    return false;
  }
  var r = Object.keys(e);
  var n = Object.keys(t);
  var i = r.length;
  if (n.length !== i) {
    return false;
  }
  for (var o = 0; o < i; o++) {
    var a = r[o];
    if (e[a] !== t[a] || !Object.prototype.hasOwnProperty.call(t, a)) {
      return false;
    }
  }
  return true;
}
module.exports = t;
};
