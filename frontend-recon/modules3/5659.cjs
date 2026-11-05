// webpack module 5659 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = function (e) {
  if (typeof e === "object") {
    return e !== null;
  } else {
    return typeof e === "function";
  }
};
};
