// webpack module 27015 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = function (e) {
  try {
    return !!e();
  } catch (t) {
    return true;
  }
};
};
