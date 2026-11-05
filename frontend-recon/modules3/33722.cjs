// webpack module 33722 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = Object.is || function (e, t) {
  if (e === t) {
    return e !== 0 || 1 / e === 1 / t;
  } else {
    return e != e && t != t;
  }
};
};
