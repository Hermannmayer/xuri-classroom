// webpack module 22319 — body from webcrack
module.exports = function (module, exports, require) {
var t = 0;
var r = Math.random();
module.exports = function (e) {
  return "Symbol(" + String(e === undefined ? "" : e) + ")_" + (++t + r).toString(36);
};
};
