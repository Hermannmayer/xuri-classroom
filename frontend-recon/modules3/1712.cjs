// webpack module 1712 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = function () {
  var e = arguments.length;
  var t = new Array(e);
  while (e--) {
    t[e] = arguments[e];
  }
  return new this(t);
};
};
