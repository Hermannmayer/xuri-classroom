// webpack module 78426 — body from webcrack
module.exports = function (module, exports, require) {
var t = Math.ceil;
var r = Math.floor;
module.exports = function (e) {
  if (isNaN(e = +e)) {
    return 0;
  } else {
    return (e > 0 ? r : t)(e);
  }
};
};
