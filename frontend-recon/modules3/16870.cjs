// webpack module 16870 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = Math.sign || function (e) {
  if ((e = +e) == 0 || e != e) {
    return e;
  } else if (e < 0) {
    return -1;
  } else {
    return 1;
  }
};
};
