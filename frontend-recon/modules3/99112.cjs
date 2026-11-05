// webpack module 99112 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = function (e) {
  try {
    return {
      error: false,
      value: e()
    };
  } catch (t) {
    return {
      error: true,
      value: t
    };
  }
};
};
